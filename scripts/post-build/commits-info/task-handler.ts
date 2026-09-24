import util from "util";
import child_process from "child_process";
import chalk from "chalk";
import { HTMLElement } from "node-html-parser";
import fetch from "node-fetch";

import { AuthorsCache, AuthorUserMap, fetchAuthors } from "./authors-cache.js";
import { TaskHandler, log } from "../html-postprocess.js";

const execFileAsync = util.promisify(child_process.execFile);

export function parseCommitsLog(log: string): { commitDate: Date; authorEmails: string[] }[] {
  return log
    .split("\x1e")
    .filter(Boolean)
    .flatMap(record => {
      const [dateLine, authorLine, message = ""] = record.split("\x00");
      if (!dateLine || !authorLine) return [];

      const coAuthors = Array.from(message.matchAll(/^\s*Co-Authored-By:\s*.*<([^<>]+)>\s*$/gim), match => match[1]);
      const authorEmails = Array.from(
        new Set([authorLine, ...coAuthors].map(email => email.trim().toLowerCase()).filter(Boolean))
      );
      return [{ commitDate: new Date(dateLine.trim()), authorEmails }];
    });
}

async function readCommitsLog(sourceFilePath: string): Promise<{ commitDate: Date; authorEmails: string[] }[]> {
  const relativeSourcePath = sourceFilePath.replace(/^\/+/, "");
  const repositoryPath = "docs/" + relativeSourcePath;
  const { stdout } = await execFileAsync(
    "git",
    ["log", "--follow", "--pretty=format:%x1e%cD%x00%aE%x00%b", "--", repositoryPath],
    { maxBuffer: 20 * 1024 * 1024 }
  );
  return parseCommitsLog(stdout);
}

const GITHUB_REPO = "Physics-Learning-Wiki/Physics-Learning-Wiki";
const AUTHORS_CACHE_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/authors-cache/authors.json`;
// Only exclude the template fallback default (hyphenated). The manually-written
// "Physics Learning Wiki" in frontmatter is a real author entry and must be kept.
const AUTHORS_EXCLUDED = ["Physics-Learning-Wiki"];

export const taskHandler = new (class implements TaskHandler<AuthorUserMap> {
  async globalInitialize() {
    log("Ensuring full Git history");
    const isShallowRepository = child_process
      .execFileSync("git", ["rev-parse", "--is-shallow-repository"], { encoding: "utf8" })
      .trim();
    if (isShallowRepository === "true") {
      child_process.execFileSync("git", ["fetch", "--unshallow"], { stdio: "inherit" });
    }
    log(`Fetching authors cache from ${chalk.yellow(AUTHORS_CACHE_URL)}`);
    const authorsCache = (await (await fetch(AUTHORS_CACHE_URL)).json()) as AuthorsCache;

    log(`Fetching authors of commits newer than: ${chalk.yellow(authorsCache.latestCommitTime)}`);
    return (await fetchAuthors(authorsCache)).userMap;
  }

  userMap: AuthorUserMap;

  async initialize(userMap: AuthorUserMap) {
    this.userMap = userMap;
  }

  async process(document: HTMLElement) {
    const $ = document.querySelector.bind(document);

    $("html")?.setAttribute("lang", "zh-Hans");

    const pageEditUrl = $(".page_edit_url");
    if (!pageEditUrl) {
      return;
    }

    // The path of .md file relative to /docs, starting with a leading "/"
    const sourceFilePath = (pageEditUrl.getAttribute("href") || "").split("?ref=")[1];
    if (sourceFilePath) {
      // Set link to git history
      $(".edit_history")?.setAttribute("href", `https://github.com/${GITHUB_REPO}/commits/main/docs${sourceFilePath}`);

      const commitsLog = await readCommitsLog(sourceFilePath);

      // "本页面最近更新"
      const factsModified = $(".facts_modified");
      if (factsModified && commitsLog.length > 0) {
        const latestDate = new Date(
          commitsLog.map(l => +new Date(l.commitDate)).reduce((latest, current) => Math.max(latest, current))
        );
        factsModified.textContent =
          latestDate.toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }) +
          " " +
          latestDate.toLocaleTimeString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
      }

      // "本页面贡献者"
      const pageContributors = $(".page_contributors");
      if (pageContributors) {
        const frontMatterContributors = pageContributors.textContent
          .trim()
          .split(",")
          .map(username => username.trim())
          .filter(Boolean)
          .map(username => `${username}\ngithub`);

        const authors = Object.entries(
          // Commit count by author
          [
            // From markdown front-matter
            ...frontMatterContributors,
            // From git history
            ...commitsLog
              .flatMap(l => l.authorEmails)
              .filter(email => this.userMap && email in this.userMap)
              .map(
                email =>
                  this.userMap[email].githubUsername
                    ? `${this.userMap[email].githubUsername}\ngithub` // GitHub username
                    : `${this.userMap[email].name}\ngit\n${email}` // Git name (when email not linked with GitHub)
              )
          ].reduce<Record<string, number>>((count, author) => {
            if (AUTHORS_EXCLUDED.some(excluded => `${excluded.toLowerCase()}\ngithub` === author.toLowerCase()))
              return count;

            count[author] = (count[author] || 0) + 1;
            return count;
          }, {})
        )
          .sort(([author1, count1], [author2, count2]) => {
            // Sort DESC by commit count
            if (count1 !== count2) return count2 - count1;
            else return author1.toLowerCase() < author2.toLowerCase() ? -1 : 1;
          })
          .map(([author]) => author);
        pageContributors.innerHTML = authors
          .map(author => {
            const [name, type, email] = author.split("\n");
            return type === "github"
              ? `<a href="https://github.com/${name}" target="_blank">${name}</a>`
              : `<a href="mailto:${email}" target="_blank">${name}</a>`;
          })
          .join(", ");
      }
    } else {
      // Pages without source
      $(".edit_history")?.setAttribute("href", `https://github.com/${GITHUB_REPO}/commits/main`);
      const factsModified = $(".facts_modified");
      if (factsModified) {
        factsModified.textContent = "无更新";
      }
      const pageContributors = $(".page_contributors");
      if (pageContributors) {
        pageContributors.textContent = "（自动生成）";
      }
      pageEditUrl.setAttribute("href", "#");
    }
  }
})();

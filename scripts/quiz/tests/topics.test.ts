import assert from "node:assert/strict";
import test from "node:test";
import { TopicTree, getTopicDescendantsAndSelf } from "../src/topics.js";

const taxonomy = {
  topics: {
    mechanics: { id: "mechanics", title: "经典力学", parent: null },
    "mechanics.dynamics": { id: "mechanics.dynamics", title: "动力学", parent: "mechanics" },
    "mechanics.kinematics": { id: "mechanics.kinematics", title: "运动学", parent: "mechanics" },
    "methods.advanced": { id: "methods.advanced", title: "进阶", parent: "mechanics.dynamics" },
    optics: { id: "optics", title: "光学", parent: null },
    "optics.wave": { id: "optics.wave", title: "波动光学", parent: "optics" }
  }
};

test("covered topics expose their ancestors, omit unused branches and keep stable ID order", () => {
  const tree = new TopicTree(taxonomy, ["methods.advanced", "unknown.topic"]);
  assert.deepEqual(tree.roots, [{ id: "mechanics", title: "经典力学" }]);
  assert.deepEqual(tree.subtopics("mechanics"), [
    { id: "mechanics.dynamics", title: "动力学" },
    { id: "methods.advanced", title: "动力学 / 进阶" }
  ]);
  assert.deepEqual(tree.subtopics("optics"), []);
  assert.deepEqual(new TopicTree(taxonomy, []).roots, []);
});

test("complete taxonomy is available to authors and root lookup follows parent links", () => {
  const tree = new TopicTree(taxonomy);
  assert.deepEqual(
    tree.roots.map(topic => topic.id),
    ["mechanics", "optics"]
  );
  assert.equal(tree.rootOf("methods.advanced"), "mechanics");
  assert.equal(tree.rootOf("unregistered.topic"), undefined);
  assert.equal(tree.subtopics("mechanics").length, 3);
});

test("topic matching aggregates descendants and never infers siblings from ancestor tags", () => {
  const tree = new TopicTree(taxonomy);
  assert.equal(tree.matches(["mechanics.dynamics"], "mechanics"), true);
  assert.equal(tree.matches(["methods.advanced"], "mechanics.dynamics"), true);
  assert.equal(tree.matches(["mechanics", "mechanics.dynamics"], "mechanics.kinematics"), false);
  assert.equal(tree.matches(["optics.wave", "mechanics.dynamics"], "mechanics"), true);
  assert.equal(tree.matches([], "mechanics"), false);
  assert.equal(tree.matches(undefined), true);
  assert.deepEqual([...getTopicDescendantsAndSelf("mechanics.dynamics", taxonomy)].sort(), [
    "mechanics.dynamics",
    "methods.advanced"
  ]);
});

test("missing taxonomy, orphaned topics and cycles do not invent navigation categories", () => {
  assert.deepEqual(new TopicTree().roots, []);
  const tree = new TopicTree({
    topics: {
      orphan: { id: "orphan", title: "孤立分类", parent: "missing" },
      a: { id: "a", title: "A", parent: "b" },
      b: { id: "b", title: "B", parent: "a" }
    }
  });
  assert.deepEqual(tree.roots, []);
  assert.equal(tree.rootOf("orphan"), undefined);
  assert.equal(tree.rootOf("a"), undefined);
  assert.deepEqual(
    [
      ...getTopicDescendantsAndSelf("a", {
        topics: {
          a: { id: "a", title: "A", parent: "b" },
          b: { id: "b", title: "B", parent: "a" }
        }
      })
    ].sort(),
    ["a", "b"]
  );
});

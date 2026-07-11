MathJax = {
  chtml: {
    matchFontHeight: false
  }
};

document$.subscribe(function () {
  if (typeof MathJax.typesetPromise === "function") {
    MathJax.typesetPromise();
  }
});

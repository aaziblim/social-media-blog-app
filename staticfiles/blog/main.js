// blog/static/blog/main.js

// Back to Top Button
const backToTop = document.getElementById("back-to-top");

window.addEventListener("scroll", () => {
  const scrollPosition = window.scrollY;

  if (scrollPosition > 300) {
    backToTop.classList.remove("opacity-0", "invisible");
    backToTop.classList.add("opacity-100", "visible");
  } else {
    backToTop.classList.remove("opacity-100", "visible");
    backToTop.classList.add("opacity-0", "invisible");
  }
});

backToTop.addEventListener("click", (e) => {
  e.preventDefault();
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

// Initialize animations
document.querySelectorAll(".animate-fade-in").forEach((el, index) => {
  el.style.opacity = "0";
  el.style.animationDelay = `${index * 0.1}s`;
});



function estimateReadingTime(text) {
  let charCount = text.length;

  if (charCount >= 1200) {
      return "5 min read";
  } else if (charCount >= 500) {
      return "2 min read";
  } else {
      return "1 min read";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  let postContentElement = document.getElementById("post-content");
  let readingTextElement = document.getElementById("reading-text");

  if (postContentElement && readingTextElement) {
      let postContent = postContentElement.innerText.trim();
      readingTextElement.innerText = estimateReadingTime(postContent);
  }
});

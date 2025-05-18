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

// Like and Dislike Buttons
document.addEventListener("DOMContentLoaded", function () {
  function handleReaction(buttonClass, actionUrl, likeSpan, dislikeSpan) {
      document.querySelectorAll(buttonClass).forEach(button => {
          button.addEventListener("click", function (event) {
              event.preventDefault();  // Prevents unnecessary form submission
              
              let postId = this.dataset.postid;
              
              fetch(actionUrl.replace("0", postId), {
                  method: "POST",
                  headers: {
                      "X-CSRFToken": "{{ csrf_token }}",
                      "X-Requested-With": "XMLHttpRequest"
                  }
              })
              .then(response => response.json())
              .then(data => {
                  console.log("Server response:", data);  // Debugging
                  
                  document.querySelector(`#${likeSpan}-${postId}`).textContent = data.likes;
                  document.querySelector(`#${dislikeSpan}-${postId}`).textContent = data.dislikes;

                  if (data.liked) {
                      this.classList.add("text-green-800");
                  } else {
                      this.classList.remove("text-green-800");
                  }

                  if (data.disliked) {
                      document.querySelector(`.dislike-button[data-postid="${postId}"]`).classList.add("text-red-800");
                  } else {
                      document.querySelector(`.dislike-button[data-postid="${postId}"]`).classList.remove("text-red-800");
                  }
              })
              .catch(error => console.error("Error:", error));
          });
      });
  }

  handleReaction(".like-button", "/like/0/", "like-count", "dislike-count");
  handleReaction(".dislike-button", "/dislike/0/", "like-count", "dislike-count");
});
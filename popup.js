document.addEventListener("DOMContentLoaded", () => {
  // Load saved API key and criteria if available
  chrome.storage.local.get(["apiKey", "criteria"], (result) => {
    if (result.apiKey) {
      document.getElementById("apiKey").value = result.apiKey;
    }
    if (result.criteria) {
      document.getElementById("criteria").value = result.criteria;
    }
  });

  // Save API key and criteria on input change
  document.getElementById("apiKey").addEventListener("input", () => {
    const apiKey = document.getElementById("apiKey").value;
    chrome.storage.local.set({ apiKey }, () => {
      console.log("API Key saved");
    });
  });

  document.getElementById("criteria").addEventListener("input", () => {
    const criteria = document.getElementById("criteria").value;
    chrome.storage.local.set({ criteria }, () => {
      console.log("Criteria saved");
    });
  });

  document.getElementById("checkButton").addEventListener("click", () => {
    const checkButton = document.getElementById("checkButton");
    checkButton.disabled = true; // Disable the button

    // Display the loading animation and hide other elements
    const container = document.querySelector(".container");
    const loadingAnimation = document.getElementById("loadingAnimation");
    loadingAnimation.style.display = "flex";

    const apiKey = document.getElementById("apiKey").value;
    const criteria = document.getElementById("criteria").value;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      document.getElementById("result").innerHTML = "";
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          function: checkLinkedInProfile,
          args: [apiKey, criteria],
        },
        (response) => {
          if (response) {
            const result = response[0].result.result;
            const why = response[0].result.why;
            if (result === true) {
              document.getElementById(
                "result"
              ).innerHTML = `<img id="statusImage" src="images/success.png" alt="True">`;
            } else if (result === false) {
              document.getElementById(
                "result"
              ).innerHTML = `<img id="statusImage" src="images/failed.png" alt="False">`;
            } else {
              document.getElementById(
                "result"
              ).innerHTML = `<img id="statusImage" src="images/error.png" alt="Error">`;
            }
            // Add event listener to the image
            document
              .getElementById("statusImage")
              .addEventListener("click", () => {
                document.getElementById(
                  "result"
                ).innerHTML = `<div id="why">${why}</div>`;
              });
          } else {
            document.getElementById("result").innerText =
              "Result: Error in fetching the result";
          }
          checkButton.disabled = false; // Re-enable the button
          loadingAnimation.style.display = "none";
        }
      );
    });
  });

  function checkLinkedInProfile(apiKey, criteria) {
    const mainElement = document.getElementsByTagName("main")[0];
    function getVisibleText(element) {
      let text = "";

      for (const child of element.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.getAttribute("aria-hidden") !== "true") {
            text += getVisibleText(child);
          }
        } else if (child.nodeType === Node.TEXT_NODE) {
          text += child.textContent;
        }
      }

      return text.replace(/[^\S\r\n]+/g, " ").replace(/\n\s*\n/g, "\n");
    }

    const profileText = getVisibleText(mainElement);
    return fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `Please tell me if this profile fits all the following criteria: \n${criteria}?

Profile:\n${profileText}

Result:
json 
{
  result : (true or false), 
  why: shortest summary (html)
}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        const content = data.choices[0].message.content;
        const jsonResponse = JSON.parse(content);
        return jsonResponse;
      })
      .catch((error) => {
        return { result: null, why: `Error: ${error}` };
      });
  }
});

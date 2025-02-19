let folderData = []; // Array to store folder structure
let checkBox = [];
let bookmarks = []; // Array to store bookmarked chats
let activeNotes = {};

function saveChat(chat) {
  chrome.runtime.sendMessage({ action: "saveChat", chat }, (response) => {
    if (response.error)
      console.error("Error saving chat to Supabase:", response.error);
    else console.log("Saved chat to Supabase:", response.data);
  });
}

function askDeepSeek(prompt, callback) {
  chrome.runtime.sendMessage({ action: "askDeepSeek", prompt }, (response) => {
    if (response) {
      console.log("DeepSeek Response:", response);
      callback(response); // Use the response in any feature
    } else {
      alert("Failed to get response from DeepSeek AI.");
    }
  });
}

// 🔹 Function to save a bookmark to Supabase
function saveBookmark(bookmark) {
  chrome.runtime.sendMessage(
    { action: "saveBookmark", bookmark },
    (response) => {
      if (response.error)
        console.error("Error saving to Supabase:", response.error);
      else console.log("Saved to Supabase:", response.data);
    }
  );
}

function renameWithAI(title, id, type) {
  const element = document.querySelector(`[data-id="${id}"]`);
  if (!element) return;

  // Create and insert the loader
  const loader = document.createElement("div");
  loader.className = "ai-rename-loader";
  loader.style.cssText = `
    width: 20px;
    height: 20px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: inline-block;
    margin-left: 10px;
  `;
  element.appendChild(loader);

  // Add the spin animation to the document
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  // Create the prompt for DeepSeek AI using the current title
  const prompt = `Suggest a short(upto 5 words) name but good so user can easily understand it (give only name, not any symbol or quotes), clear name for: ${title}`;

  askDeepSeek(prompt, (response) => {
    // Remove loader when response arrives
    if (loader && loader.parentNode) {
      loader.parentNode.removeChild(loader);
    }
    // Clean the AI response: if the response includes text wrapped in **, extract that text.
    let newName = response.trim();
    const match = newName.match(/\*\*(.*?)\*\*/);
    console.log("new1", newName);

    if (match) {
      newName = match[1].trim();
    }

    console.log("new", newName);
    // If a new name is returned, update the item and send it to the backend.
    if (newName) {
      chrome.storage.local.get(["user"], (result) => {
        if (!result.user) {
          console.warn("No user logged in.");
          return;
        }

        const user_id = result?.user?.id;
        title = newName;
        // Update Supabase
        chrome.runtime.sendMessage(
          {
            action: "renameFoldersAndChats",
            itemId: id,
            newTitle: title,
            itemType: type,
            user_id: user_id,
          },
          (response) => {
            if (response.error) {
              console.error("Error renaming item:", response.error);
            } else {
              console.log("Item renamed successfully:", response.data);
            }
          }
        );
      });
    } else {
      console.warn("No valid name returned from AI.");
    }
  });
}

// Add this function to get AI-suggested color
async function getAIColorSuggestion(folderTitle) {
  const prompt = `Based on the folder name "${folderTitle}", suggest a color that would be semantically appropriate. Only respond with the hex color code, no other text. For example: #4B70F5`;

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: "askDeepSeek", prompt },
      (response) => {
        // Clean up the response to ensure it's a valid hex color
        const hexColor = response.match(/#[0-9A-Fa-f]{6}/)?.[0] || "#4B70F5";
        resolve(hexColor);
      }
    );
  });
}

// Add this function to generate AI colors
async function generateAIColorPalette() {
  const prompts = [
    "Generate a vibrant, energetic color",
    "Generate a calm, soothing color",
    "Generate a professional, business-like color",
    "Generate a creative, artistic color",
    "Generate a nature-inspired color",
    "Generate a modern, tech-inspired color",
    "Generate a warm, inviting color",
    "Generate a cool, refreshing color",
    "Generate a luxurious, elegant color",
    "Generate a playful, fun color",
  ];

  // Repeat prompts to get 50 colors (5 variations of each theme)
  const allPrompts = Array(5).fill(prompts).flat();

  return Promise.all(
    allPrompts.map((prompt) => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: "askDeepSeek", prompt },
          (response) => {
            const hexColor =
              response.match(/#[0-9A-Fa-f]{6}/)?.[0] || generateRandomColor();
            resolve(hexColor);
          }
        );
      });
    })
  );
}

// Helper function to generate random color if AI fails
function generateRandomColor() {
  return (
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
  );
}

const defaultIcons = {
  images: [
    // URLs
    "https://th.bing.com/th/id/OIP.pMZnhVPpiwBuK7h9eT-2qwHaHa?w=178&h=180&c=7&r=0&o=5&dpr=1.3&pid=1.7",
    "https://avatars.githubusercontent.com/u/54469796?v=4",
    "https://play-lh.googleusercontent.com/DYXNS7NyuIgbCk5ElbK2Ch7dNuUnnCJ2ToDsV0QK0Q-MiGWQR7oDl9w8VXGinA5ureA",
    "https://stripe-camo.global.ssl.fastly.net/548134147663fc43c8748f38a79ccc6d4c805872186d84dcc4bda0f067ccc736/68747470733a2f2f66696c65732e7374726970652e636f6d2f6c696e6b732f4d44423859574e6a64463878536a56474e58464757485a4e52484a6a5356553566475a7358327870646d566659327852596b6f335a456c704d474659566b70305a31686e5646686e56584e4c3030764c613735314231",
    "https://biz.prlog.org/decentplatform/logo.png",
    "https://res.cloudinary.com/beincrypto/image/upload/v1658310711/logos/gwycfgcvp9x5kqzswdra.jpg",
    "https://yt3.ggpht.com/a/AATXAJz5a1O8SpQqjM20Ikj1Uye99NyrrXj1WrRkfA=s900-c-k-c0xffffffff-no-rj-mo",
    "https://th.bing.com/th/id/OIP.Ov5P7tFABDTM9_7Qtrw84AHaHa?w=1024&h=1024&rs=1&pid=ImgDetMain",



    // Local paths (if you have local icons)
    "./image/icons/1.png",
    "./image/icons/2.ico",





    // Emojis
    "📁",
    "📂",
    "📚",
    "🗂️",
    "📌",
    "📎",
    "🔖",
    "📋",
    "📝",
    "📑",
    "💼",
    "🗄️",
    "🗃️",
    "📒",
    "📕",
    "📗",
    "📘",
    "📙",
    "🗂",
    "🎭",
    "📂", "📁", "↗️", "💀", "📒", "🌟", "⭐", "📄", "❤️", "💕", "🛠️", "💰", "👻", "✈️" , "🎬", "🤖", "💀", "👮‍♀️", "🕵️‍♂️",
  "🏃‍♀️", "🚶‍♂️", "🚣‍♂️", "🏄‍♀️", "✌️", "✍️", "👪", "🧑‍🤝‍🧑", "🎈", "🎆", "🎇",  "🧨", "✨", "🎉", "🎊", "🎃", "🎄",
  "🎋", "🎍", "🎎", "🎏", "🎐", "🎑", "🧧", "🎀", "🎁", "🎗️", "🎞️", "🎟️", "🎫", "🎠", "🛝", "🎡", "🎢", "🎪", "🎭",
  "🖼️", "🎨", "🧵", "🪡", "🧶", "🪢", "🛒", "👓", "🕶️", "🦺", "🥽", "🥼", "🧥", "👔", "👕", "👖", "🩳", "🧣", "🧤",
  "🧦", "👗", "🥻", "👘", "👚", "🩲", "🩱", "⛑️", "🎓", "⚾", "🥎", "🏀", "🏐", "🏈", "🏉", "⛳", "🥅", "🛷", "🎿",
  "🏒", "🥍", "🏏", "🥉", "🥈", "🥇", "🏅", "🎖️", "🏆", "🎮", "🕹️", "🎯", "🎲", "♠️", "♣️", "♟️", "📢", "📣", "🎙️",
  "🎤", "🔔", "🥁", "📯", "🎺", "🪗", "📻", "🧱", "🛖", "⚙️", "🪵", "🛢️", "🗜️", "⚗️", "🧪", "🧫", "🧬", "🩺", "🩻",
  "💉", "🩸", "🩹", "🩼", "💊", "🔬", "🔭", "⚖️", "📿", "⛓️", "📿", "🔗", "🪝", "🧲", "📱", "🔫", "💣", "🫙", "📟",
  "📞", "☎️", "🪃", "🗿", "🖨️", "💽", "💾", "💿", "📀", "📺", "🪔", "💡", "📹", "🗂️", "🗄️", "🍔", "🍟", "🌭", "🍕",
  "🍿", "🧂", "🍖", "🥫", "🫔", "🍞", "🥗", "🥙", "🥪", "🌮", "🥩", "🍘", "🍙", "🍤", "🍣", "🍜", "🍛", "🍚", "🥣",
  "🍩", "🍪", "🍬", "🍭", "🚗", "🚓", "🚕", "🛺", "🚙", "🛻", "🚌", "🚐", "🚎", "🚑", "🚒", "🚚", "🚛", "🚜", "🚘",
  "🚔", "🚖", "🚍", "🦽", "🦼", "🛹", "🛼", "🚲", "🛴", "🏍️", "🛵", "🏎️", "🚄", "🚅", "🚈", "🚟", "✈️", "🪂",
  "🛩️", "🛫", "🛬", "🛸", "🚀", "🚁", "⚓", "⛽", "🛞", "🏳️‍🌈", "🏁", "🚧", "🏳️", "🏴", "🏴‍☠️", "🚩", "🌌", "🪐",
  "🌍", "🌎", "🌏", "🗺️", "🧭", "🏔️", "⛰️", "🏞️", "🏕️", "🛤️", "🗻", "🏜️", "🏝️", "🏟️", "🏛️", "🏗️", "🏠", "🏙️",
  "🕌", "🛕", "🕍", "⛩️", "🏢", "🏣", "🕋", "🏪", "🏩", "🏤", "🏫", "🏬", "🏭", "🏯", "🏰", "💒", "🗾", "🌉",
  "🗼", "⛺", "🌁", "🌃", "🌄", "♨️", "🌇", "🪞", "🛗", "🛎️", "💈", "🪠", "🧻", "🫧", "🧼", "🪤", "🧯", "🧷", "🌪️",
  "🌗", "🌑", "🌝", "🌖", "🌕", "🌔", "🌓", "🌒", "🌞", "🌟", "⭐", "🌠", "☄️", "🌡️", "⛱️", "⚡", "🌈", "☃️", "⛄",
  "🔥", "🌊", "💧", "💦", "💫", "💨", "☢️", "🔱", "⚜️", "♻️", "🌐", "❎", "✅", "0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣",
  "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟", "🔢", "▶️", "⏸️", "⏹️", "⏺️", "↘️", "↗️", "➡️", "⬆️",
    

    
  ],
};

// Add new function to handle text color picker
// Update the showTextColorPicker function to ensure color persistence
function showTextColorPicker(folder, folderTitle) {
  const colorPicker = document.createElement("div");
  colorPicker.style.cssText = `
    position: absolute;
    background: #2a2a2a;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border: 1px solid #444;
    min-width: 200px;
  `;

  // Custom color input section
  const customColorSection = document.createElement("div");
  customColorSection.style.cssText = `
    display: flex;
    gap: 5px;
    align-items: center;
  `;

  const customColorInput = document.createElement("input");
  customColorInput.type = "color";
  customColorInput.value = "#ffffff"; // Default to white
  customColorInput.style.cssText = `
    width: 50px;
    height: 30px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;

  const applyButton = document.createElement("button");
  applyButton.textContent = "Apply Color";
  applyButton.style.cssText = `
    padding: 8px 12px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    flex-grow: 1;
  `;

  customColorSection.appendChild(customColorInput);
  customColorSection.appendChild(applyButton);
  colorPicker.appendChild(customColorSection);

  // Predefined colors
  const predefinedColors = [
    "#ffffff",
    "#000000",
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffff00",
    "#00ffff",
    "#ff00ff",
  ];
  const predefinedColorsContainer = document.createElement("div");
  predefinedColorsContainer.style.cssText = `
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 5px;
  `;

  predefinedColors.forEach((color) => {
    const colorOption = document.createElement("div");
    colorOption.style.cssText = `
      width: 25px;
      height: 25px;
      background-color: ${color};
      border-radius: 4px;
      cursor: pointer;
      border: 1px solid #444;
    `;

    colorOption.addEventListener("click", () => {
      // Apply and save the color
    folderTitle.style.color = color;
    const textColor = color;
    
    chrome.storage.local.get(["user"], (result) => {
      if (!result.user) {
        console.warn("No user logged in.");
        return;
      }

      const user_id = result.user.id;

      // Save colors to Supabase
      chrome.runtime.sendMessage(
        {
          action: "updateTextColors",
          folderId: folder.id,
          color: textColor,
          user_id: user_id
        },
        (response) => {
          if (response.error) {
            console.error("Error updating folder colors:", response.error);
          } else {
            console.log("Folder colors updated in Supabase:", response.data);
          }
        }
      );
    });

    colorPicker.remove();
    });

    predefinedColorsContainer.appendChild(colorOption);
  });

  colorPicker.appendChild(predefinedColorsContainer);

  applyButton.addEventListener("click", () => {
    const color = customColorInput.value;
    // Apply and save the color
    folderTitle.style.color = color;
    chrome.storage.local.get(["folderTextColors"], (result) => {
      const folderTextColors = result.folderTextColors || {};
      folderTextColors[folder.id] = color;
      chrome.storage.local.set({ folderTextColors }, () => {
        console.log("Text color saved:", color, "for folder:", folder.id);
      });
    });
    colorPicker.remove();
  });

  // Position the color picker
  const rect = folderTitle.getBoundingClientRect();
  colorPicker.style.left = `${rect.right + 10}px`;
  colorPicker.style.top = `${rect.top}px`;

  document.body.appendChild(colorPicker);

  // Close color picker when clicking outside
  function handleClickOutside(e) {
    if (!colorPicker.contains(e.target) && e.target !== folderTitle) {
      colorPicker.remove();
      document.removeEventListener("click", handleClickOutside);
    }
  }

  // Delay adding the click listener to prevent immediate closing
  requestAnimationFrame(() => {
    document.addEventListener("click", handleClickOutside);
  });
}

function showImagePicker(folder, folderTitle) {
  const imagePicker = document.createElement("div");
  imagePicker.style.cssText = `
    position: absolute;
    background: #2a2a2a;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border: 1px solid #444;
    min-width: 300px;
  `;

  // Create tabs container
  const tabsContainer = document.createElement("div");
  tabsContainer.style.cssText = `
    display: flex;
    gap: 5px;
    border-bottom: 1px solid #444;
    padding-bottom: 10px;
    margin-bottom: 10px;
  `;

  const tabs = ["User Added", "AI Generated", "Default"];
  let activeTab = "Default";

  // Create tab buttons
  tabs.forEach((tabName) => {
    const tab = document.createElement("button");
    tab.textContent = tabName;
    tab.style.cssText = `
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
      background: ${activeTab === tabName ? "#444" : "#333"};
      color: white;
    `;

    tab.addEventListener("mouseover", () => {
      if (activeTab !== tabName) {
        tab.style.background = "#3a3a3a";
      }
    });

    tab.addEventListener("mouseleave", () => {
      if (activeTab !== tabName) {
        tab.style.background = "#333";
      }
    });

    tab.addEventListener("click", () => {
      activeTab = tabName;
      updateActiveTab();
      showImages(tabName);
    });

    tabsContainer.appendChild(tab);
  });

  // Create image grid
  const imageGrid = document.createElement("div");
  imageGrid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 5px;
    max-height: 200px;
    overflow-y: auto;
    padding-right: 5px;
  `;

  // Custom image input section
  const customImageSection = document.createElement("div");
  customImageSection.style.cssText = `
    display: flex;
    gap: 5px;
    align-items: center;
    margin-top: 10px;
  `;

  const customImageInput = document.createElement("input");
customImageInput.type = "file";
customImageInput.accept = "image/*";
customImageInput.style.cssText = `
  width: 100px;
  height: 30px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
`;

const label = document.createElement("label");
label.textContent = "Upload Images";
label.style.cssText = `
  display: inline-block;
  width: 130px;
  height: 35px;
  text-align: center;
  line-height: 35px;
  background: #007bff;
  color: white;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap
`;
label.appendChild(customImageInput);
customImageInput.style.display = "none";

// Event listener to update label text when a file is selected
customImageInput.addEventListener("change", function () {
  if (customImageInput.files.length > 0) {
    label.textContent = "Selected";
  } else {
    label.textContent = "Upload Images";
  }
});
  

  const addToMyImagesBtn = document.createElement("button");
  addToMyImagesBtn.textContent = "Add to My Images";
  addToMyImagesBtn.style.cssText = `
    padding: 8px 12px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    flex-grow: 1;
  `;

  customImageSection.appendChild(label);
  customImageSection.appendChild(addToMyImagesBtn);

  // Add components to image picker
  imagePicker.appendChild(tabsContainer);
  imagePicker.appendChild(imageGrid);
  imagePicker.appendChild(customImageSection);
  document.body.appendChild(imagePicker);

  // Function to update active tab styling
  function updateActiveTab() {
    Array.from(tabsContainer.children).forEach((tab) => {
      tab.style.background = tab.textContent === activeTab ? "#444" : "#333";
    });
  }

  // Function to create image option
  function createImageOption(imageUrl) {
    const imageOption = document.createElement("img");
    imageOption.src = imageUrl;
    imageOption.className = "imageOption";
    imageOption.style.cssText = `
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid #444;
      transition: transform 0.2s;
    `;

    const renderImage = document.createElement("img");
    renderImage.src = imageUrl;
    renderImage.className = "renderedImage";
    renderImage.style.cssText = `
      width: 20px;
      height: 20px;
      object-fit: cover;
      border-radius: 4px;
      transition: transform 0.2s;
    `;

    imageOption.addEventListener("mouseover", () => {
      imageOption.style.transform = "scale(0.9)";
      imageOption.style.border = "1px solid white";
    });

    imageOption.addEventListener("mouseleave", () => {
      imageOption.style.transform = "scale(1)";
      imageOption.style.border = "none";
    });

    imageOption.addEventListener("click", () => {
      // Remove existing image if there is one
      const existingImage =
        folderTitle.querySelector(".renderedImage");
      if (existingImage) {
        existingImage.remove();
      }

      chrome.storage.local.get(["user"], (result) => {
        if (!result.user) {
          console.warn("No user logged in.");
          return;
        }

        const user_id = result?.user?.id;

        chrome.runtime.sendMessage(
          {
            action: "updateFolderImage",
            imageUrl: imageUrl,
            folderId: folder.id,
            user_id: user_id,
          },
          (response) => {
            if (response.error) {
              console.error(
                "Error updating folder parent:",
                response.error
              );
            } else {
              console.log(
                "Folder parent updated in Supabase:",
                response.data
              );
            }
          }
        );

      })

      // Insert new image before text inside folderTitle
      folderTitle.innerHTML = ""; // Clear existing content
      folderTitle.appendChild(renderImage);
      folderTitle.appendChild(document.createTextNode(` ${folder.title.replace("📁", "")}`));

      imagePicker.remove();

      // Save the custom image to storage
      chrome.storage.local.get(["folderImages"], (result) => {
        const folderImages = result.folderImages || {};
        folderImages[folder.id] = imageUrl;
        chrome.storage.local.set({ folderImages });
      });

      imagePicker.remove();
    });

    return imageOption;
  }

  // Modify the showImages function to include AI-generated images
  function showImages(tabName) {
    imageGrid.innerHTML = "";

    if (tabName === "AI Generated") {
      // Create generate button container
      const generateContainer = document.createElement("div");
      generateContainer.style.cssText = `
        grid-column: 1 / -1;
        display: flex;
        justify-content: center;
        margin-bottom: 10px;
      `;

      const generateButton = document.createElement("button");
      generateButton.textContent = "Generate AI Icons";
      generateButton.style.cssText = `
        padding: 8px 16px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      `;

      generateButton.addEventListener("click", async () => {
        generateButton.disabled = true;
        generateButton.style.opacity = "0.7";

        const prompt = `Generate an icon or emoji that represents: ${folder.title}. Only respond with either a URL to an icon or an emoji character. No other text.`;

        try {
          const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
              { action: "askDeepSeek", prompt },
              resolve
            );
          });

          // Check if response is an emoji or URL
          const isEmoji = /\p{Emoji}/u.test(response);
          const isUrl = response.startsWith("http");

          if (isEmoji || isUrl) {
            chrome.storage.local.get(["aiImages"], (result) => {
              const aiImages = new Set(result.aiImages || []);
              aiImages.add(response);
              chrome.storage.local.set(
                { aiImages: Array.from(aiImages) },
                () => {
                  showImages("AI Generated");
                }
              );
            });
          }
        } catch (error) {
          console.error("Error generating AI icon:", error);
        } finally {
          generateButton.disabled = false;
          generateButton.style.opacity = "1";
        }
      });

      generateContainer.appendChild(generateButton);
      imageGrid.appendChild(generateContainer);
    }

    chrome.storage.local.get(["userImages", "aiImages"], (result) => {
      const userImages = result.userImages || [];
      const aiImages = result.aiImages || [];

      let images = [];

      switch (tabName) {
        case "User Added":
          images = userImages;
          break;
        case "AI Generated":
          images = aiImages;
          break;
        case "Default":
          images = defaultIcons.images;
          break;
      }

      images.forEach((imageUrl) => {
        const isUrl = /^(https?:\/\/|data:image)/.test(imageUrl); // Checks if imageUrl is a valid URL
        const isEmoji = !isUrl && /^[\p{Emoji}]+$/u.test(imageUrl); // Ensures the string is purely an emoji

        if (isEmoji) {
          // Create emoji option
          const emojiOption = document.createElement("div");
          emojiOption.style.cssText = `
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: pointer;
            border-radius: 8px;
            border: 1px solid #444;
            transition: transform 0.2s;
          `;
          emojiOption.textContent = imageUrl;

          emojiOption.addEventListener("mouseover", () => {
            emojiOption.style.transform = "scale(0.9)";
            emojiOption.style.border = "1px solid white";
          });
      
          emojiOption.addEventListener("mouseleave", () => {
            emojiOption.style.transform = "scale(1)";
            emojiOption.style.border = "none";
          });

          emojiOption.addEventListener("click", () => {
            folderTitle.textContent = `${imageUrl} ${folder.title.replace(
              "📁",
              ""
            )}`;

            chrome.storage.local.get(["user"], (result) => {
              if (!result.user) {
                console.warn("No user logged in.");
                return;
              }

              const user_id = result?.user?.id;

              chrome.runtime.sendMessage(
                {
                  action: "updateFolderImage",
                  imageUrl: imageUrl,
                  folderId: folder.id,
                  user_id: user_id,
                },
                (response) => {
                  if (response.error) {
                    console.error(
                      "Error updating folder parent:",
                      response.error
                    );
                  } else {
                    console.log(
                      "Folder parent updated in Supabase:",
                      response.data
                    );
                  }
                }
              );

            })

            imagePicker.remove();
          });

          imageGrid.appendChild(emojiOption);
        } else if (isUrl) {
          // Create image option for URLs and local paths
          const imageOption = createImageOption(imageUrl);
          imageGrid.appendChild(imageOption);
        }
      });

      if (images.length === 0 && tabName !== "AI Generated") {
        const message = document.createElement("div");
        message.style.cssText = `
          grid-column: 1 / -1;
          text-align: center;
          color: #888;
          padding: 20px;
          font-size: 12px;
        `;
        message.textContent = `No ${tabName.toLowerCase()} icons yet`;
        imageGrid.appendChild(message);
      }
    });
  }

  

  // Add image to user's collection
  addToMyImagesBtn.addEventListener("click", () => {
    const newImage = customImageInput.files[0];

    if (newImage) {
      const reader = new FileReader();
      reader.onload = function () {
        const imageUrl = reader.result;

        chrome.storage.local.get(["userImages"], (result) => {
          const userImages = result.userImages || [];
          if (!userImages.includes(imageUrl)) {
            userImages.push(imageUrl);
            chrome.storage.local.set({ userImages }, () => {
              if (activeTab === "User Added") {
                showImages("User Added");
              }
            });
          }
        });

        const renderImage = document.createElement("img");
        renderImage.src = imageUrl;
        renderImage.className = "renderedImage";
        renderImage.style.cssText = `
          width: 20px;
          height: 20px;
          object-fit: cover;
          border-radius: 4px;
          transition: transform 0.2s;
        `;

        

        chrome.storage.local.get(["user"], (result) => {
          if (!result.user) {
            console.warn("No user logged in.");
            return;
          }
  
          const user_id = result?.user?.id;
  
          chrome.runtime.sendMessage(
            {
              action: "updateFolderImage",
              imageUrl: imageUrl,
              folderId: folder.id,
              user_id: user_id,
            },
            (response) => {
              if (response.error) {
                console.error(
                  "Error updating folder parent:",
                  response.error
                );
              } else {
                console.log(
                  "Folder parent updated in Supabase:",
                  response.data
                );
              }
            }
          );
  
        })
  
        // Insert new image before text inside folderTitle
        folderTitle.innerHTML = ""; // Clear existing content
        folderTitle.appendChild(renderImage);
        folderTitle.appendChild(document.createTextNode(` ${folder.title.replace("📁", "")}`));
       

        // Save the custom image to storage
        chrome.storage.local.get(["folderImages"], (result) => {
          const folderImages = result.folderImages || {};
          folderImages[folder.id] = imageUrl;
          chrome.storage.local.set({ folderImages });
        });

        imagePicker.remove();
      };

      reader.readAsDataURL(newImage);
    }
  });

  // Position the image picker
  const rect = folderTitle.getBoundingClientRect();
  imagePicker.style.left = `${rect.right + 10}px`;
  imagePicker.style.top = `${rect.top}px`;

  // Improved click outside handling
  function handleClickOutside(e) {
    if (!imagePicker.contains(e.target) && e.target !== folderTitle) {
      imagePicker.remove();
      document.removeEventListener("click", handleClickOutside);
    }
  }

  // Delay adding the click listener to prevent immediate closing
  requestAnimationFrame(() => {
    document.addEventListener("click", handleClickOutside);
  });

  // Show default images initially
  showImages("Default");
}

// Add this function after the colorGenerator function
function showColorPicker(folder, folderTitle) {
  const colorPicker = document.createElement("div");
  colorPicker.style.cssText = `
    position: absolute;
    background: #2a2a2a;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border: 1px solid #444;
    min-width: 300px;
  `;

  // Create tabs container
  const tabsContainer = document.createElement("div");
  tabsContainer.style.cssText = `
    display: flex;
    gap: 5px;
    border-bottom: 1px solid #444;
    padding-bottom: 10px;
    margin-bottom: 10px;
  `;

  const tabs = ["User Added", "AI Added", "Default"];
  let activeTab = "Default";

  // Create tab buttons
  tabs.forEach((tabName) => {
    const tab = document.createElement("button");
    tab.textContent = tabName;
    tab.style.cssText = `
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
      background: ${activeTab === tabName ? "#444" : "#333"};
      color: white;
    `;

    tab.addEventListener("mouseover", () => {
      if (activeTab !== tabName) {
        tab.style.background = "#3a3a3a";
      }
    });

    tab.addEventListener("mouseleave", () => {
      if (activeTab !== tabName) {
        tab.style.background = "#333";
      }
    });

    tab.addEventListener("click", () => {
      activeTab = tabName;
      updateActiveTab();
      showColors(tabName);
    });

    tabsContainer.appendChild(tab);
  });

  // Create color grid
  const colorGrid = document.createElement("div");
  colorGrid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 5px;
    max-height: 200px;
    overflow-y: auto;
    padding-right: 5px;
  `;

  // Custom color input section
  const customColorSection = document.createElement("div");
  customColorSection.style.cssText = `
    display: flex;
    gap: 5px;
    align-items: center;
    margin-top: 10px;
  `;

  const customColorInput = document.createElement("input");
  customColorInput.type = "color";
  customColorInput.style.cssText = `
    width: 50px;
    height: 30px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;

  const addToMyColorsBtn = document.createElement("button");
  addToMyColorsBtn.textContent = "Add to My Colors";
  addToMyColorsBtn.style.cssText = `
    padding: 8px 12px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    flex-grow: 1;
  `;

  customColorSection.appendChild(customColorInput);
  customColorSection.appendChild(addToMyColorsBtn);

  // Add components to color picker
  colorPicker.appendChild(tabsContainer);
  colorPicker.appendChild(colorGrid);
  colorPicker.appendChild(customColorSection);
  document.body.appendChild(colorPicker);

  // Function to update active tab styling
  function updateActiveTab() {
    Array.from(tabsContainer.children).forEach((tab) => {
      tab.style.background = tab.textContent === activeTab ? "#444" : "#333";
    });
  }

  // Function to create color option
  function createColorOption(color) {
    const colorOption = document.createElement("div");
    colorOption.style.cssText = `
      width: 25px;
      height: 25px;
      background-color: ${color};
      border-radius: 50%;
      cursor: pointer;
      border: 1px solid #444;
      transition: transform 0.2s;
    `;

    colorOption.addEventListener("mouseover", () => {
      colorOption.style.transform = "scale(1.1)";
      colorOption.style.border = "1px solid white";
    });

    colorOption.addEventListener("mouseleave", () => {
      colorOption.style.transform = "scale(1)";
      colorOption.style.border = "none";
    });

    colorOption.addEventListener("click", () => {
      const backgroundColor = color;
      const textColor = isColorDark(color) ? "white" : "black";
      
      folderTitle.style.backgroundColor = backgroundColor;
      folderTitle.style.color = textColor;
  
      chrome.storage.local.get(["user"], (result) => {
        if (!result.user) {
          console.warn("No user logged in.");
          return;
        }
  
        const user_id = result.user.id;
  
        // Save colors to Supabase
        chrome.runtime.sendMessage(
          {
            action: "updateFolderColors",
            folderId: folder.id,
            bgColor: backgroundColor,
            color: textColor,
            user_id: user_id
          },
          (response) => {
            if (response.error) {
              console.error("Error updating folder colors:", response.error);
            } else {
              console.log("Folder colors updated in Supabase:", response.data);
            }
          }
        );
      });
  
      colorPicker.remove();
    });

    return colorOption;
  }

  // Modify the showColors function to include AI color generation
  function showColors(tabName) {
    colorGrid.innerHTML = "";

    if (tabName === "AI Added") {
      // Create generate button container
      const generateContainer = document.createElement("div");
      generateContainer.style.cssText = `
      grid-column: 1 / -1;
      display: flex;
      justify-content: center;
      margin-bottom: 10px;
    `;

      const generateButton = document.createElement("button");
      generateButton.textContent = "Generate AI Colors";
      generateButton.style.cssText = `
      padding: 8px 16px;
      background: #2196F3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    `;

      generateButton.addEventListener("mouseover", () => {
        generateButton.style.background = "#1976D2";
      });

      generateButton.addEventListener("mouseleave", () => {
        generateButton.style.background = "#2196F3";
      });

      // Loading spinner
      const loadingSpinner = document.createElement("div");
      loadingSpinner.style.cssText = `
      width: 20px;
      height: 20px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #2196F3;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-left: 10px;
      display: none;
    `;

      // Add animation keyframes
      const style = document.createElement("style");
      style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
      document.head.appendChild(style);

      generateButton.addEventListener("click", async () => {
        generateButton.disabled = true;
        generateButton.style.opacity = "0.7";
        loadingSpinner.style.display = "block";

        try {
          const newColors = await generateAIColorPalette();

          // Save new colors
          chrome.storage.local.get(["aiColors"], (result) => {
            const aiColors = new Set(result.aiColors || []);
            newColors.forEach((color) => aiColors.add(color));
            chrome.storage.local.set({ aiColors: Array.from(aiColors) }, () => {
              showColors("AI Added"); // Refresh the display
            });
          });
        } catch (error) {
          console.error("Error generating AI colors:", error);
        } finally {
          generateButton.disabled = false;
          generateButton.style.opacity = "1";
          loadingSpinner.style.display = "none";
        }
      });

      generateContainer.appendChild(generateButton);
      generateContainer.appendChild(loadingSpinner);
      colorGrid.appendChild(generateContainer);
    }

    chrome.storage.local.get(["userColors", "aiColors"], (result) => {
      const userColors = result.userColors || [];
      const aiColors = result.aiColors || [];

      let colors = [];

      switch (tabName) {
        case "User Added":
          colors = userColors;
          break;
        case "AI Added":
          colors = aiColors;
          break;
        case "Default":
          colors = Object.values(colorPalette).flat();
          break;
      }

      colors.forEach((color) => {
        colorGrid.appendChild(createColorOption(color));
      });

      // Show message if no colors and not in AI tab (since it has the generate button)
      if (colors.length === 0 && tabName !== "AI Added") {
        const message = document.createElement("div");
        message.style.cssText = `
        grid-column: 1 / -1;
        text-align: center;
        color: #888;
        padding: 20px;
        font-size: 12px;
      `;
        message.textContent = `No ${tabName.toLowerCase()} colors yet`;
        colorGrid.appendChild(message);
      }
    });
  }

  // Add color to user's collection
  addToMyColorsBtn.addEventListener("click", () => {
    const newColor = customColorInput.value;

    chrome.storage.local.get(["userColors"], (result) => {
      const userColors = result.userColors || [];
      if (!userColors.includes(newColor)) {
        userColors.push(newColor);
        chrome.storage.local.set({ userColors }, () => {
          if (activeTab === "User Added") {
            showColors("User Added");
          }
        });
      }
    });

    folderTitle.style.backgroundColor = newColor;
    folderTitle.style.color = isColorDark(newColor) ? "white" : "black";

    // Save the custom color to storage
    chrome.storage.local.get(["folderColors"], (result) => {
      const folderColors = result.folderColors || {};
      folderColors[folder.id] = newColor;
      chrome.storage.local.set({ folderColors });
    });

    colorPicker.remove();
  });

  // Position the color picker
  const rect = folderTitle.getBoundingClientRect();
  colorPicker.style.left = `${rect.right + 10}px`;
  colorPicker.style.top = `${rect.top}px`;

  // Close color picker when clicking outside
  function handleClickOutside(e) {
    if (!colorPicker.contains(e.target) && e.target !== folderTitle) {
      colorPicker.remove();
      document.removeEventListener("click", handleClickOutside);
    }
  }

  // Delay adding the click listener to prevent immediate closing
  requestAnimationFrame(() => {
    document.addEventListener("click", handleClickOutside);
  });

  // Show default colors initially
  showColors("Default");
}

function deleteFolder(folderId, user_id) {
  chrome.runtime.sendMessage(
    { action: "deleteFolder", folderId: folderId, user_id: user_id },
    (response) => {
      if (response.error) {
        console.error("Error deleting folder from Supabase:", response.error);
      } else {
        console.log("Folder deleted successfully:", response.data);
        // ✅ Remove tooltip on delete

        if (activeTooltip) {
          console.log("akd", activeTooltip);
          activeTooltip.style.display = "none";
          document.body.removeChild(activeTooltip);
          activeTooltip = null;
        }

        fetchData(); // ✅ Reload folder structure after deletion
      }
    }
  );
}

function deleteChat(chatId, user_id) {
  chrome.runtime.sendMessage(
    { action: "deleteChat", chatId: chatId, user_id: user_id },
    (response) => {
      if (response.error) {
        console.error("Error deleting chat from Supabase:", response.error);
      } else {
        console.log("Chat deleted successfully:", response.data);
        fetchData(); // ✅ Reload chat list after deletion
      }
    }
  );
}

function deleteBookmark(bookmarkId, user_id) {
  chrome.runtime.sendMessage(
    { action: "deleteBookmarks", bookmarkId: bookmarkId, user_id: user_id },
    (response) => {
      if (response.error) {
        console.error("Error deleting chat from Supabase:", response.error);
      } else {
        console.log("Chat deleted successfully:", response.data);
        fetchData(); // ✅ Reload chat list after deletion
      }
    }
  );
}

function createAuthUI() {
  const sidebar = document.querySelector("[title='ChatGPT']").parentElement;
  if (!sidebar) return;

  const authContainer = document.createElement("div");
  authContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px;
    background: #1e1e1e;
    border-radius: 8px;
    color: white;
    font-size: 14px;
  `;

  chrome.storage.local.get(["user"], (result) => {
    if (result.user) {
      // User is logged in - Show Sign Out Button
      const userMessage = document.createElement("p");
      userMessage.innerText = `Welcome, ${result.user.username || "User"}`;
      userMessage.style.cssText = `
        margin-bottom: 10px;
        font-size: 16px;
        font-weight: bold;
        color: #ffeb3b;
      `;

      const signOutButton = document.createElement("button");
      signOutButton.innerText = "Sign Out";
      signOutButton.style.cssText = `
        width: 90%;
        margin: 5px;
        padding: 10px;
        background: #F44336;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 14px;
        border-radius: 5px;
      `;

      signOutButton.addEventListener("click", () => {
        chrome.storage.local.remove("user", () => {
          console.log("User signed out.");
          location.reload(); // Refresh the UI
        });
      });

      authContainer.appendChild(userMessage);
      authContainer.appendChild(signOutButton);
    } else {
      // User is not logged in - Show Sign Up and Sign In Buttons
      const authMessage = document.createElement("p");
      authMessage.innerText = "Sign up to use this";
      authMessage.style.cssText = `
        margin-bottom: 10px;
        font-size: 16px;
        font-weight: bold;
        color: #ffeb3b;
      `;

      const signUpButton = document.createElement("button");
      signUpButton.innerText = "Sign Up";
      signUpButton.style.cssText = `
        width: 90%;
        margin: 5px;
        padding: 10px;
        background: #4CAF50;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 14px;
        border-radius: 5px;
      `;

      const signInButton = document.createElement("button");
      signInButton.innerText = "Sign In";
      signInButton.style.cssText = `
        width: 90%;
        margin: 5px;
        padding: 10px;
        background: #2196F3;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 14px;
        border-radius: 5px;
      `;

      signUpButton.addEventListener("click", () => openAuthModal("signUp"));
      signInButton.addEventListener("click", () => openAuthModal("signIn"));

      authContainer.appendChild(authMessage);
      authContainer.appendChild(signUpButton);
      authContainer.appendChild(signInButton);
    }

    sidebar.append(authContainer);
  });
}

const observer6 = new MutationObserver((mutations, observerInstance) => {
  const targetElement =
    document.querySelector("[title='ChatGPT']").parentElement;
  if (targetElement) {
    createAuthUI();
    observerInstance.disconnect();
  }
});

observer6.observe(document.body, { childList: true, subtree: true });

function openAuthModal(mode) {
  // 🔹 Remove existing modal if any
  const existingModal = document.querySelector("#auth-modal");
  if (existingModal) existingModal.remove();

  // 🔹 Create modal container
  const modal = document.createElement("div");
  modal.id = "auth-modal";
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #2a2a2a;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    text-align: center;
    z-index: 1000;
    width: 300px;
  `;

  const title = document.createElement("h2");
  title.innerText = mode === "signUp" ? "Sign Up" : "Sign In";
  title.style.color = "white";

  const usernameInput = document.createElement("input");
  usernameInput.placeholder = "Enter Username";
  usernameInput.style.cssText = `
    display: block;
    margin: 10px auto;
    padding: 10px;
    width: 90%;
    border-radius: 5px;
    border: 1px solid #555;
    background: #333;
    color: white;
  `;

  const passwordInput = document.createElement("input");
  passwordInput.placeholder = "Enter Password";
  passwordInput.type = "password";
  passwordInput.style.cssText = `
    display: block;
    margin: 10px auto;
    padding: 10px;
    width: 90%;
    border-radius: 5px;
    border: 1px solid #555;
    background: #333;
    color: white;
  `;

  const actionButton = document.createElement("button");
  actionButton.innerText = mode === "signUp" ? "Create Account" : "Login";
  actionButton.style.cssText = `
    width: 90%;
    margin-top: 10px;
    padding: 10px;
    background: ${mode === "signUp" ? "#4CAF50" : "#2196F3"};
    border: none;
    color: white;
    cursor: pointer;
    font-size: 14px;
    border-radius: 5px;
  `;

  const closeButton = document.createElement("button");
  closeButton.innerText = "Close";
  closeButton.style.cssText = `
    margin-top: 10px;
    padding: 8px;
    background: #F44336;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 14px;
    border-radius: 5px;
    width: 90%;
  `;

  closeButton.addEventListener("click", () => modal.remove());

  actionButton.addEventListener("click", () => {
    const username = usernameInput.value;
    const password = passwordInput.value;

    if (!username || !password) {
      alert("Please enter both username and password.");
      return;
    }

    // 🔹 Call Sign Up or Sign In function
    chrome.runtime.sendMessage(
      { action: mode, username, password },
      (response) => {
        if (response.error) {
          alert(response.error);
        } else {
          alert(
            mode === "signUp" ? "Account created!" : "Logged in successfully!"
          );
          location.reload();
        }
      }
    );
  });

  modal.appendChild(title);
  modal.appendChild(usernameInput);
  modal.appendChild(passwordInput);
  modal.appendChild(actionButton);
  modal.appendChild(closeButton);

  document.body.appendChild(modal);
}

// 🔹 Function to save a folder to Supabase
function saveFolder(folder) {
  chrome.runtime.sendMessage({ action: "saveFolder", folder }, (response) => {
    if (response.error)
      console.error("Error saving folder to Supabase:", response.error);
    else console.log("Saved folder to Supabase:", response.data);
  });
}

function fetchData(retryCount = 0, updateType, updatedItem) {
  chrome.storage.local.get(["user"], (result) => {
    if (!result.user) {
      console.warn("No user logged in.");
      return;
    }

    const user_id = result?.user?.id;
    localStorage.setItem("user_id", user_id);
    console.log("user", result);
    chrome.runtime.sendMessage({ action: "getData", user_id }, (response) => {
      if (response.error) {
        console.error("Error fetching data from Supabase:", response.error);
        return;
      }

      console.log("Fetching Data...");

      if (
        !response.folders ||
        !response.bookmarks ||
        !response.chats ||
        !response.chatFolders
      ) {
        console.warn("Data not fully loaded, retrying...");
        if (retryCount < 5) {
          // Retry max 5 times
          setTimeout(() => fetchData(retryCount + 1), 500);
        }
        return;
      }

      // 🔹 Ensure bookmarks are properly initialized
      bookmarks = response.bookmarks.map((bookmark) => ({
        id: bookmark?.id,
        title: bookmark?.title || "Untitled Bookmark",
        link: bookmark?.link || "#",
      }));

      console.log("Loaded Bookmarks:", bookmarks); // 🔹 Debugging: Check if bookmarks are fetched

      // 🔹 Ensure all folders are initialized properly
      let allFolders = response.folders.map((folder) => ({
        id: folder?.id,
        title: folder?.title || "Untitled Folder",
        type: "folder",
        parent_id: folder?.parent_id || null,
        image: folder.image,
        children: [],
        backgroundColor: folder.backgroundColor,
        textColor: folder.textColor
      }));

      // 🔹 Convert list into a nested structure
      folderData = [];
      const folderMap = {};

      // 🔹 Create a map of all folders
      allFolders.forEach((folder) => {
        folderMap[folder.id] = folder;
        if (folder.parent_id === null) {
          folderData.push(folder);
        }
      });

      // 🔹 Assign subfolders to their parent folders
      allFolders.forEach((folder) => {
        if (folder.parent_id !== null) {
          const parentFolder = folderMap[folder.parent_id];
          if (parentFolder) {
            parentFolder.children.push(folder);
          }
        }
      });

      // 🔹 Place chats inside their respective folders
      response.chatFolders.forEach((relation) => {
        const folder = folderMap[relation.folder_id];
        if (folder) {
          folder.children.push({
            id: relation.chat_id,
            title: relation.chats?.title || "Untitled Chat",
            link: relation.chats?.link || "#",
            type: "file",
          });
        }
      });

      console.log("Final Folder Structure:", folderData);

      if (updateType === "INSERT") {
        console.log("New item added:", updatedItem);

        if (table === "bookmarks") {
          const newBookmark = {
            id: updatedItem.id,
            title: updatedItem.title || "Untitled Bookmark",
            link: updatedItem.link || "#",
          };

          bookmarks.push(newBookmark);
          updateBookmarksDisplay(); // 🔹 Ensure UI updates with new bookmarks
        } else if (table === "folders") {
          if (!folderMap[updatedItem.id]) {
            const newFolder = {
              id: updatedItem.id,
              title: updatedItem.title || "Untitled Folder",
              type: "folder",
              parent_id: updatedItem.parent_id || null,
              children: [],
            };

            folderMap[newFolder.id] = newFolder;

            if (newFolder.parent_id === null) {
              folderData.push(newFolder);
            } else {
              const parentFolder = folderMap[newFolder.parent_id];
              if (parentFolder) {
                parentFolder.children.push(newFolder);
              }
            }
          }
        }
      } else if (updateType === "UPDATE") {
        console.log("Item updated:", updatedItem);
        if (table === "bookmarks") {
          const existingBookmark = bookmarks.find(
            (b) => b.id === updatedItem.id
          );
          if (existingBookmark) existingBookmark.title = updatedItem.title;
        } else if (table === "folders") {
          const existingFolder = folderMap[updatedItem.id];
          if (existingFolder) existingFolder.title = updatedItem.title;
        }
      } else if (updateType === "DELETE") {
        console.log("Item deleted:", updatedItem);
        if (table === "bookmarks") {
          bookmarks = bookmarks.filter((b) => b.id !== updatedItem.id);
          updateBookmarksDisplay(); // 🔹 Ensure UI updates after deleting a bookmark
        } else if (table === "folders") {
          folderData = folderData.filter((item) => item.id !== updatedItem.id);
        }
      }

      // 🔹 Sort folders by `id` to maintain order
      folderData.sort((a, b) => a.id - b.id);
      folderData.forEach((folder) => {
        folder.children.sort((a, b) => a.id - b.id);
      });

      // 🔹 Update UI only when all data is loaded
      if (folderData.length > 0 || bookmarks.length > 0 || chats.length > 0) {
        renderFolders(folderData, document.querySelector(".folders"));
        updateBookmarksDisplay(); // 🔹 Ensure this runs after bookmarks are set
      } else {
        console.warn("Data still empty, retrying...");
        if (retryCount < 5) {
          setTimeout(() => fetchData(retryCount + 1), 500);
          console.log("1");
        }
      }
    });
  });
}

// 🔹 Call `fetchData` when the extension loads
fetchData();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "realtimeUpdate") {
    console.log("🔄 Real-time update received:", message);

    const { table, updateType, updatedItem } = message;

    // 🔹 Refresh only the affected data instead of reloading everything
    if (
      table === "folders" ||
      table === "bookmarks" ||
      table === "chats" ||
      table === "chats_folder"
    ) {
      fetchData(updateType, updatedItem);
    }
  }
});

// const link = document.createElement("link");
// link.rel = "stylesheet";
// link.href = chrome.runtime.getURL("styles.css");
// document.head.appendChild(link);

const observer4 = new MutationObserver((mutations, observerInstance) => {
  // Search section
  const searchSection = document.createElement("div");
  searchSection.style.cssText = `
  width: 100%;
  padding: 10px 0;
`;
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search History...";
  searchInput.style.cssText = `
  width: 100%;
  padding: 8px;
  border-radius: 5px;
  border: 1px solid #444;
  background-color: black;
  color: white;
`;

  // Function to search and filter items using startsWith
  function searchAndFilterHistoryItems(searchText) {
    const allHistoryItems = Array.from(
      document.querySelectorAll("li.relative")
    );

    allHistoryItems.forEach((item) => {
      const textElement = item.firstChild?.firstChild?.firstChild;
      const originalText = textElement?.innerText || "";

      if (searchText.trim() === "") {
        // Show all items and reset text if search input is empty
        item.style.display = "block";
        textElement.innerHTML = originalText;
        return;
      }

      if (originalText.toLowerCase().startsWith(searchText.toLowerCase())) {
        // Highlight the portion of the text that starts with the input
        const highlightedText = `<span style="color: white; background: #7E57C2; letter-spacing: 1.2px">${originalText.slice(
          0,
          searchText.length
        )}</span>${originalText.slice(searchText.length)}`;
        textElement.innerHTML = highlightedText;
        item.style.display = "block"; // Show matching item
      } else {
        item.style.display = "none"; // Hide non-matching items
      }
    });
  }

  // Add event listener to the search input
  searchInput.addEventListener("input", (e) =>
    searchAndFilterHistoryItems(e.target.value)
  );

  const chatsSearchParent = document.querySelector(
    "li[data-testid='history-item-3']"
  ).parentElement.parentElement;

  const parentContainer = chatsSearchParent.parentElement;
  parentContainer.insertBefore(searchSection, parentContainer.firstChild);

  searchSection.appendChild(searchInput);

  // Locate the target element
  const targetElement = document.querySelector("[aria-label='Chat history']");

  if (targetElement) {
    const widthContainer =
      targetElement.parentElement.parentElement.parentElement.parentElement;

    // Ensure the container has position: relative for absolute positioning
    widthContainer.style.position = "relative";

    // Hide the scrollbars but keep scrolling functionality
    widthContainer.style.overflow = "auto";
    widthContainer.style.scrollbarWidth = "none"; // Firefox
    widthContainer.style.msOverflowStyle = "none"; // IE and Edge

    // Hide Webkit-based scrollbars (Chrome, Safari, Edge Chromium)
    const css = `
        ::-webkit-scrollbar {
          display: none;
        }
      `;
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = css;
    document.head.appendChild(styleSheet);

    // Create the custom slider element
    const slider = document.createElement("div");
    slider.innerText = "⋮⋮";
    slider.style.color = "rgb(128, 102, 204)";
    slider.style.position = "absolute";
    slider.style.top = "50%";
    slider.style.right = "0";
    slider.style.transform = "translateY(-50%)";
    slider.style.zIndex = "10000000";
    slider.style.width = "30px";
    slider.style.height = "30px";
    slider.style.backgroundColor = "rgba(128, 102, 204, 0.2)";
    slider.style.border = "1px solid rgb(128, 102, 204)";
    slider.style.cursor = "ew-resize";
    slider.style.borderRadius = "50%";
    slider.style.display = "grid";
    slider.style.placeItems = "center";

    // Add tooltip for slider
    const tooltip = document.createElement("div");
    tooltip.style.cssText = `
  position: fixed;
  background-color: #1a1a1a;
  color: white;
  padding: 10px 15px;
  border-radius: 8px;
  font-size: 14px;
  pointer-events: none;
  z-index: 10000;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  border: 1px solid #333;
  display: none;
  max-width: 300px;
  word-wrap: break-word;
  backdrop-filter: blur(5px);
  transition: opacity 0.2s ease;
  opacity: 0;
`;
    tooltip.innerHTML = `
  <div style="font-weight: 600; margin-bottom: 4px;">Slide Right</div>
`;
    document.body.appendChild(tooltip);

    slider.addEventListener("mouseover", () => {
      tooltip.style.display = "block";
      tooltip.style.opacity = "1";
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let left = slider.offsetLeft + slider.offsetWidth + 15;
      let top =
        slider.offsetTop + slider.offsetHeight / 2 - tooltipRect.height / 2;
      if (left + tooltipRect.width > viewportWidth) {
        left = slider.offsetLeft - tooltipRect.width - 15;
      }
      if (top + tooltipRect.height > viewportHeight) {
        top = slider.offsetTop - tooltipRect.height - 15;
      }
      tooltip.style.left = left + "px";
      tooltip.style.top = top + "px";
    });

    slider.addEventListener("mouseleave", () => {
      tooltip.style.opacity = "0";
      setTimeout(() => {
        tooltip.style.display = "none";
      }, 200);
    });

    // Append the slider if it hasn't already been appended
    // if (!widthContainer.querySelector("div")) {
    widthContainer.appendChild(slider);
    // }

    // Add drag functionality
    let isDragging = false;
    let startX;
    let startWidth;

    slider.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;
      startWidth = widthContainer.offsetWidth;
      tooltip.style.display = "none";
      // Prevent text selection during dragging
      document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      tooltip.style.display = "none";
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + deltaX); // Minimum width of 50px
      widthContainer.style.width = `${newWidth}px`;

      // Adjust the width of the first child element
      if (widthContainer.firstChild) {
        widthContainer.firstChild.style.width = `${newWidth}px`;
      }
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        tooltip.style.display = "none";
        // Restore text selection
        document.body.style.userSelect = "";
      }
    });

    // Stop observing once the target is found
    observerInstance.disconnect();
  }
});

// Observe changes in the DOM to locate the target element
observer4.observe(document.body, { childList: true, subtree: true });

// Content script that runs on chat.openai.com
// ... (previous code remains the same until colorGenerator section)

// Enhanced color palette with semantic colors
const colorPalette = {
  // Document/File related
  document: ["#4B70F5", "#3F51B5", "#2196F3", "#03A9F4", "#00BCD4"],

  // Organization/Structure related
  organization: ["#009688", "#4CAF50", "#8BC34A", "#CDDC39", "#46C2CB"],

  // Important/Priority related
  important: ["#FF204E", "#F44336", "#FF5722", "#FF8A8A", "#FF9800"],

  // Project related
  project: ["#9C27B0", "#673AB7", "#795548", "#607D8B", "#9575CD"],

  // Archive/Storage related
  archive: ["#757575", "#9E9E9E", "#7E57C2", "#5C6BC0", "#42A5F5"],

  // Default colors for other categories
  default: [
    "#46C2CB",
    "#FF9800",
    "#9BEC00",
    "#4B70F5",
    "#FF204E",
    "#FFC400",
    "#7E57C2",
    "#42A5F5",
    "#FF5733",
    "#28B463",
    "#AF7AC5",
    "#F4D03F",
    "#5DADE2",
    "#F1948A",
    "#82E0AA",
    "#BB8FCE",
    "#FF5722",
    "#4CAF50",
    "#8E44AD",
    "#FFEB3B",
    "#2196F3",
    "#FF7043",
    "#66BB6A",
    "#9575CD",
    "#FFD54F",
    "#26C6DA",
    "#EC407A",
    "#AB47BC",
    "#7E57C2",
    "#FFA726",
    "#26A69A",
    "#9CCC65",
    "#C2185B",
    "#FFC107",
    "#673AB7",
    "#F44336",
    "#00BCD4",
    "#CDDC39",
    "#3F51B5",
    "#FF5252",
    "#69F0AE",
    "#536DFE",
    "#FF80AB",
    "#448AFF",
    "#F06292",
    "#7C4DFF",
    "#80CBC4",
    "#FFAB00",
    "#FF6F00",
    "#64DD17",
    "#D32F2F",
    "#C0CA33",
    "#5E35B1",
    "#E64A19",
    "#29B6F6",
    "#9C27B0",
    "#E91E63",
    "#8BC34A",
    "#D4E157",
    "#81D4FA",
    "#EF5350",
    "#7E57C2",
    "#FFB74D",
    "#B39DDB",
    "#03A9F4",
    "#FF4081",
    "#BA68C8",
    "#388E3C",
    "#B2FF59",
    "#009688",
    "#FFE57F",
    "#689F38",
    "#512DA8",
    "#C51162",
    "#4DD0E1",
    "#FF7043",
    "#FFCDD2",
    "#9FA8DA",
    "#B3E5FC",
    "#81C784",
    "#FFC107",
    "#D50000",
    "#E040FB",
    "#64B5F6",
    "#F9A825",
    "#A5D6A7",
    "#BDBDBD",
    "#757575",
    "#DD2C00",
    "#76FF03",
    "#0097A7",
    "#43A047",
    "#E65100",
    "#E53935",
    "#512DA8",
    "#FFB300",
  ],
};

// Keywords to categorize folders
const categoryKeywords = {
  document: ["docs", "documents", "files", "notes", "reports", "papers"],
  organization: ["admin", "organize", "structure", "system", "manage"],
  important: ["important", "urgent", "priority", "critical", "essential"],
  project: ["project", "work", "task", "client", "development"],
  archive: ["archive", "backup", "storage", "old", "completed"],
};

function determineCategory(folderName) {
  const nameLower = folderName.toLowerCase();

  // Check each category's keywords
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => nameLower.includes(keyword))) {
      return category;
    }
  }

  return "default";
}

function generateConsistentHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function colorGenerator(name) {
  // Remove emoji and trim
  const cleanName = name
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]/gu, "")
    .trim();

  // Determine the category based on folder name
  const category = determineCategory(cleanName);

  // Get the color palette for the category
  const palette = colorPalette[category];

  // Generate a consistent hash for the folder name
  const hash = generateConsistentHash(cleanName);

  // Use the hash to select a color from the palette
  const colorIndex = hash % palette.length;

  // Return the selected color
  return palette[colorIndex];
}

// ... (rest of the file remains unchanged)

// create a random id generator
function generateRandomId() {
  return Math.floor(Math.random() * 1000000);
}

// Update the isColorDark function to handle invalid inputs better
function isColorDark(rgb) {
  if (!rgb) {
    console.error("Invalid RGB value:", rgb);
    return false;
  }

  // Handle hex colors
  if (rgb.startsWith("#")) {
    const r = parseInt(rgb.slice(1, 3), 16);
    const g = parseInt(rgb.slice(3, 5), 16);
    const b = parseInt(rgb.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  }

  // Handle rgb/rgba colors
  const match = rgb.match(/\d+/g);
  if (!match) {
    console.error("Invalid RGB format:", rgb);
    return false;
  }

  const [r, g, b] = match.map(Number);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
}

const observer = new MutationObserver((mutations, observerInstance) => {
  const targetElement = document.querySelector(
    "button[data-testId='explore-gpts-button']"
  )?.parentElement?.parentElement?.parentElement;

  if (targetElement) {
    createUI(targetElement); // Call to set up the UI
    observerInstance.disconnect(); // Disconnect observer after initialization
  }
});

// Observe changes in the DOM to locate the target element
observer.observe(document.body, { childList: true, subtree: true });

let debounceTimer;

const observer8 = new MutationObserver((mutations) => {
  clearTimeout(debounceTimer); // Clear the previous debounce timer

  debounceTimer = setTimeout(() => {
    // Set a new debounce timer
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        document.querySelectorAll(".folder-title").forEach((folderTitle) => {
          const folderId = parseInt(folderTitle.dataset.id, 10);
          chrome.storage.local.get(["folderTextColors"], (result) => {
            const folderTextColors = result.folderTextColors || {};
            const storedColor = folderTextColors[folderId];

            // Only apply the color if it's different from the current color
            if (storedColor && folderTitle.style.color !== storedColor) {
              folderTitle.style.color = storedColor;
              console.log("✅");
            }
          });
        });
      }
    });
  }, 1000); // Wait for 300ms after the last mutation to apply the color
});

// Observe changes in the document body (or more specifically, a narrower scope if needed)
observer8.observe(document.body, { childList: true, subtree: true });


const guideModal = document.createElement("div");
guideModal.style.cssText = `
  position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%);
  background-color: #1a1a1a; padding: 25px; border-radius: 12px; z-index: 10000; 
  display: none; width: 90%; max-width: fit-content; max-height: 85vh; overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1);
  font-family: 'Inter', 'Segoe UI', sans-serif; 
  color: #e1e1e1;
`;

// Add custom styles
const style = document.createElement('style');
style.textContent = `
  .guide-accordion {
    background-color: #2a2a2a;
    border: 1px solid #444;
    border-radius: 8px;
    cursor: pointer;
    padding: 16px;
    width: 100%;
    text-align: left;
    outline: none;
    transition: 0.3s;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #e1e1e1;
    font-weight: 600;
  }
  
  .guide-accordion:hover {
    background-color: #333;
  }
  
  .guide-accordion:after {
    content: '+';
    font-size: 22px;
    font-weight: 300;
    color: #ccc;
    margin-left: 10px;
  }
  
  .guide-accordion.active:after {
    content: '−';
  }
  
  .guide-panel {
    padding: 0 18px;
    background-color: #1a1a1a;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out;
    margin-top: 2px;
    margin-bottom: 10px;
    border-radius: 0 0 8px 8px;
  }
  
  .guide-step-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: #673AB7;
    border-radius: 50%;
    margin-right: 15px;
    flex-shrink: 0;
  }
  
  .guide-step-content {
    padding: 18px 10px;
    line-height: 1.5;
  }
  
  .guide-step-content em {
    display: block;
    margin-top: 8px;
    color: #a09fff;
    font-style: italic;
    font-size: 0.95em;
  }
  
  .guide-step-content ul {
    list-style-type: decimal;
    padding-left: 20px;
    margin: 12px 0;
  }
  
  .guide-step-content li {
    margin-bottom: 8px;
  }
  
  .guide-step-content .warning {
    background-color: rgba(255, 193, 7, 0.1);
    border-left: 3px solid #ffc107;
    padding: 10px 15px;
    margin: 12px 0;
    font-size: 0.95em;
  }
  
  .close-btn {
    padding: 10px 20px;
    font-size: 15px;
    background-color: #673AB7;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-top: 20px;
  }
  
  .close-btn:hover {
    background-color: #7e57c2;
  }
  
  .guide-footer {
    text-align: center;
    color: #aaa;
    font-size: 14px;
    margin-top: 20px;
  }
`;
document.head.appendChild(style);

guideModal.innerHTML = `
  <div style="display: flex; flex-direction: column; gap: 20px;">
    <h2 style="text-align: center; color: #e1e1e1; font-size: 24px; margin-bottom: 10px;">
      Welcome, Champion! 🚀
    </h2>
    <p id="guide-intro" style="text-align: center; color: #ccc; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
      You've installed the extension that will transform your experience. Let's explore your new powers:
    </p>
    
    <div id="guide-steps">
      <button class="guide-accordion">
        <span class="guide-step-icon">👤</span>
        <span>Log In / Sign Up</span>
      </button>
      <div class="guide-panel">
        <div class="guide-step-content">
          Secure your identity and join the elite circle.
          <em>If you're already logged in, your credentials prove you're a seasoned warrior—stride into step 2!</em>
        </div>
      </div>

      <button class="guide-accordion">
        <span class="guide-step-icon">📁</span>
        <span>Organize Chats</span>
      </button>
      <div class="guide-panel">
        <div class="guide-step-content">
          Arrange your chats like a general planning a campaign.
          <em>If you haven't started, create your first chat; if you have, you're already strategizing like a pro!</em>
          
          <ul>
            <li>Hover over the chats left sidebar</li>
            <li>You will see an Add button</li>
            <li>Click on it and a modal box will appear</li>
            <li>Select folder in which you want to keep the chat</li>
            <li>Click on save. Done! It's easy</li>
          </ul>
          
          <div class="warning">
            <strong>⚠️ Important:</strong> If you have not created a folder, first create a folder then come back to this step.
          </div>
        </div>
      </div>

      <button class="guide-accordion">
        <span class="guide-step-icon">🔖</span>
        <span>Bookmark Key Insights</span>
      </button>
      <div class="guide-panel">
        <div class="guide-step-content">
          Capture those golden nuggets of wisdom that light your path.
          <em>If your bookmarks are already shining, your archive of insights is proof you're ahead of the game!</em>
        </div>
      </div>

      <button class="guide-accordion">
        <span class="guide-step-icon">🖌️</span>
        <span>Customize Folders</span>
      </button>
      <div class="guide-panel">
        <div class="guide-step-content">
          Personalize your workspace with style—make every folder your signature.
          <em>If your folders are already set, your creative flair speaks volumes. On to the next challenge!</em>
        </div>
      </div>

      <button class="guide-accordion">
        <span class="guide-step-icon">⏰</span>
        <span>Set Reminders</span>
      </button>
      <div class="guide-panel">
        <div class="guide-step-content">
          Schedule your moments of brilliance—time is your ally.
          <em>If reminders are in place, you're managing your time like a true legend. Charge ahead!</em>
          
          <ul>
            <li>First add Notes in any chats in folders</li>
            <li>Now right click on notes and click on "Set Reminder"</li>
            <li>Now set the date and time</li>
            <li>Make sure you choose a date and time when you'll be using your browser</li>
          </ul>
          
          <div class="warning">
            <strong>Note:</strong> Reminders will only appear when you're using the browser.
          </div>
        </div>
      </div>

      <button class="guide-accordion">
        <span class="guide-step-icon">🤖</span>
        <span>AI Assistance</span>
      </button>
      <div class="guide-panel">
        <div class="guide-step-content">
          Harness the power of AI for razor-sharp insights and unstoppable efficiency.
          <em>If you're already tapping into AI, welcome to the inner circle of innovators!</em>
        </div>
      </div>
    </div>

    <p class="guide-footer">
      Encounter a glitch? Keep cool 😎 – Shoot us an email or leave a review. We're here to fuel your ascent!
    </p>
    
    <div style="display: flex; justify-content: center; padding: 10px;">
      <button id="close-guide-btn" class="close-btn">Got It!</button>
    </div>
  </div>
`;
document.body.appendChild(guideModal);

// Add single accordion functionality
const accordions = document.querySelectorAll(".guide-accordion");
accordions.forEach(accordion => {
  accordion.addEventListener("click", function() {
    // Close all other accordions
    accordions.forEach(item => {
      if (item !== this && item.classList.contains("active")) {
        item.classList.remove("active");
        item.nextElementSibling.style.maxHeight = null;
      }
    });
    
    // Toggle current accordion
    this.classList.toggle("active");
    const panel = this.nextElementSibling;
    
    if (panel.style.maxHeight) {
      panel.style.maxHeight = null;
    } else {
      panel.style.maxHeight = panel.scrollHeight + "px";
    }
  });
});

// Close button functionality
document.getElementById("close-guide-btn").addEventListener("click", function() {
  guideModal.style.display = "none";
});

// Function to show the modal
function showGuideModal() {
  guideModal.style.display = "flex";
  
  // Open first accordion by default
  if (accordions.length > 0) {
    accordions[0].click();
  }
}



function createUI(targetElement) {
  // Add custom CSS
  const style = document.createElement('style');
  style.textContent = `
    .custom-sidebar {
      padding: 20px;
      margin: 15px 0;
      background-color: #121212;
      border-radius: 12px;
      color: #e1e1e1;
      box-shadow: 0 4px 6px rgba(0,0,0,0.2);
      font-family: 'Inter', 'Segoe UI', sans-serif;
      border: 1px solid rgba(255,255,255,0.1);
    }
    
    .section-header {
      font-size: 15px;
      font-weight: 600;
      color: #a8a8a8;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .section-header:before {
      content: '';
      height: 1px;
      background-color: rgba(255,255,255,0.1);
      flex-grow: 0;
      width: 0;
      margin-right: 0;
      transition: width 0.3s, margin 0.3s;
    }
    
    .section-header:after {
      content: '';
      height: 1px;
      background-color: rgba(255,255,255,0.1);
      flex-grow: 1;
      margin-left: 6px;
    }
    
    .custom-button {
      padding: 8px 12px;
      font-size: 14px;
      background-color: #2a2a2a;
      color: #e1e1e1;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.2s, transform 0.1s;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .custom-button:hover {
      background-color: #333;
    }
    
    .custom-button:active {
      transform: translateY(1px);
    }
    
    .accent-button {
      background-color: #673AB7;
      color: white;
    }
    
    .accent-button:hover {
      background-color: #7e57c2;
    }
    
    .custom-input {
      padding: 8px 12px;
      font-size: 14px;
      background-color: #1e1e1e;
      color: #e1e1e1;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      width: 100%;
      transition: border-color 0.2s;
    }
    
    .custom-input:focus {
      outline: none;
      border-color: #673AB7;
    }
    
    .custom-input::placeholder {
      color: #888;
    }
    
    .folders-container {
      margin-top: 12px;
      overflow-y: auto;
      max-height: 300px;
    }
    
    .bookmarks-list {
      margin-top: 8px;
      overflow-y: auto;
      max-height: 200px;
    }
  `;
  document.head.appendChild(style);

  const container = document.createElement("div");
  container.className = "custom-sidebar";
  
  container.innerHTML = `
    <div id="main-container" style="display: flex; flex-direction: column; gap: 18px;">
      <button id="openGuide" class="custom-button accent-button">
        <span style="font-size: 18px;">📕</span> User Guide
      </button>
      
      <div>
        <div class="section-header">
          <span style="font-size: 16px;">🔖</span> Bookmarks
        </div>
        <div class="bookmarks-list" style="display: flex; flex-direction: column; gap: 8px; alignItems: center;"></div>
      </div>
      
      <div>
        <div class="section-header">
          <span style="font-size: 16px;">📁</span> Folders
        </div>
        
        <input 
          type="text" 
          id="folderSearch"
          placeholder="Search folders and chats..."
          class="custom-input"
        >
        
        <button id="addFolder" class="custom-button" style="margin-top: 12px;">
          <span style="font-size: 14px;">➕</span> New Folder
        </button>
        
        <div class="folders folders-container"></div>
      </div>
    </div>
  `;

  targetElement.insertAdjacentElement("afterend", container);

  // Initialize components
  setupFolderUI(container.querySelector(".folders"));
  setupAddFolderButton(container.querySelector("#addFolder"));
  
  // Attach event for guide button
  container.querySelector("#openGuide").addEventListener("click", function() {
    if (typeof showGuideModal === 'function') {
      showGuideModal();
    } else {
      console.warn("Guide modal function not found");
    }
  });
}

function renderFolders(folderArray, container, depth = 0) {
  // Always clear the container first
  container.innerHTML = "";

  if (!Array.isArray(folderArray) || folderArray.length === 0) {
    console.warn("No folders to render.");
    return; // Now the container is already empty
  }

  folderArray.forEach((folder) => {
    if (!folder) return;
    const folderElement = createFolderElement(folder, depth);
    container.appendChild(folderElement);
  });
}

function createFolder(parentId = null) {
  chrome.storage.local.get(["user"], (result) => {
    if (!result.user) {
      console.warn("No user logged in.");
      return;
    }

    const user_id = result.user.id; // ✅ Ensure we get the correct user ID

    const folderName = prompt("Enter Folder Name:");
    if (!folderName) return;

    const newFolder = {
      title: folderName,
      parent_id: parentId,
      user_id: user_id, // ✅ Include user_id
      type: "folder",
      children: [],
    };

    // 🔹 Send the folder with user ID to `background.mjs`
    chrome.runtime.sendMessage(
      { action: "saveFolder", folder: newFolder },
      (response) => {
        if (response.error) {
          console.error("Error saving folder to Supabase:", response.error);
        } else {
          console.log("Folder successfully saved:", response.data);
          fetchData(); // Reload UI
        }
      }
    );
  });
}

function createFolderElement(folder, index, depth) {
  const folderElement = document.createElement("div");
  folderElement.style.marginLeft = "5px";
  folderElement.style.flexDirection = "column";
  const backgroundColor = colorGenerator(folder.title);

  const folderTitle = document.createElement("p");
  folderTitle.className = "folder-title";
  
  folderTitle.id = "aiLoaderContainer";
  folderTitle.style.cssText = `
  background-color: ${folder.type === "folder" ? backgroundColor : "black"};
  padding: 5px; border-radius: 5px; cursor: pointer;
  margin-top: 10px; font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: flex;
  align-items: center;
  gap: 5px;
  `;

  const isUrl = /^(https?:\/\/|data:image)/.test(folder.image); // Checks if imageUrl is a valid URL
  const isEmoji = !isUrl && /^[\p{Emoji}]+$/u.test(folder.image);

  if(folder?.image && folder?.type === 'folder'){
    if(isEmoji){
      folderTitle.textContent = `${folder.image} ${folder.title.replace(
        "📁",
        ""
      )}`;
    } else if(isUrl){
      const renderImage = document.createElement("img");
      renderImage.src = folder.image;
      renderImage.className = "renderedImage";
      renderImage.style.cssText = `
        width: 20px;
        height: 20px;
        object-fit: cover;
        border-radius: 4px;
        transition: transform 0.2s;
      `;
  
      folderTitle.appendChild(renderImage);
      folderTitle.appendChild(document.createTextNode(` ${folder.title.replace("📁", "")}`));
  
    }
  }
  else {
    folderTitle.textContent = folder.title;
  }

  folderTitle.addEventListener("click", () => {
    if (folder.type === "file") window.location.href = folder.link;
  });

  folderTitle.addEventListener("contextmenu", () => {
    sessionStorage.setItem("folderId", folder.id);
  });

  // Add drag and drop functionality

  function findItemById(folderData, id) {
    for (const folder of folderData) {
      if (folder.id === id) {
        return folder;
      }
      if (folder.children) {
        const found = findItemById(folder.children, id);
        if (found) return found;
      }
    }
    return null;
  }

    if (folder?.backgroundColor && folder?.textColor) {
      folderTitle.style.backgroundColor = folder?.backgroundColor;
      folderTitle.style.color = folder?.textColor;
    }

  if (folder.type === "file" || folder.type === "folder") {
    folderTitle.draggable = true;
    folderTitle.dataset.id = folder.id;
    folderTitle.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData(
        "text/plain",
        JSON.stringify({
          id: folder.id,
          title: folder.title,
          type: folder.type,
        })
      );
      folderTitle.style.opacity = "0.5";
    });
    folderTitle.addEventListener("dragend", () => {
      folderTitle.style.opacity = "1";
    });
  }

  if (folder.type === "folder") {
    folderTitle.addEventListener("dragover", (e) => {
      e.preventDefault();
      folderTitle.style.backgroundColor = "rgb(100, 100, 100)";
    });

    folderTitle.addEventListener("dragleave", () => {
      folderTitle.style.backgroundColor = backgroundColor;
    });

    folderTitle.addEventListener("drop", (e) => {
      e.preventDefault();
      folderTitle.style.backgroundColor = backgroundColor;

      // Hide any active tooltip immediately on drop
      if (activeTooltip) {
        activeTooltip.style.display = "none";
        document.body.removeChild(activeTooltip);
        activeTooltip = null;
      }

      try {
        const draggedItem = JSON.parse(e.dataTransfer.getData("text/plain"));

        if (draggedItem.id === folder.id) {
          console.warn("Cannot drop a folder into itself.");
          return;
        }

        chrome.storage.local.get(["user"], (result) => {
          if (!result.user) {
            console.warn("No user logged in.");
            return;
          }

          const user_id = result?.user?.id;

          if (draggedItem.type === "file") {
            // Find the dragged folder or file and preserve its children if it's a folder
            const draggedItemData = findItemById(folderData, draggedItem.id);

            // Remove from old location
            removeItemFromFolder(folderData, draggedItem.id);

            // 🔹 Step 2: Update chat folder in Supabase
            chrome.runtime.sendMessage(
              {
                action: "updateChatFolder",
                chatId: draggedItem.id,
                folderId: folder.id,
                user_id: user_id,
              },
              (response) => {
                if (response.error) {
                  console.error("Error updating chat folder:", response.error);
                } else {
                  console.log(
                    "Chat folder updated in Supabase:",
                    response.data
                  );
                  fetchData(); // ✅ Refresh UI after update
                }
              }
            );

            // Update parent_id in Supabase
            chrome.runtime.sendMessage(
              {
                action: "updateFolderParent",
                folderId: draggedItem.id,
                parentId: folder.id,
                user_id: user_id,
              },
              (response) => {
                if (response.error) {
                  console.error(
                    "Error updating folder parent:",
                    response.error
                  );
                } else {
                  console.log(
                    "Folder parent updated in Supabase:",
                    response.data
                  );
                }
              }
            );

            // Add to new location
            // folder.children.unshift({
            //   id: draggedItemData.id,
            //   title: draggedItemData.title,
            //   type: draggedItemData.type,
            //   children: draggedItemData.children || [], // Preserve children if it's a folder
            // });

            // // Save and re-render
            // chrome.storage.local.set({ folderData: folderData });

            renderFolders(folderData, document.querySelector(".folders"));
          }
        });
      } catch (err) {
        console.error("Error processing drop:", err);
      }
    });
  }

  // Add drag and drop functionality
  if (folder.type === "file") {
    folderTitle.draggable = true;
    folderTitle.dataset.id = folder.id;
    folderTitle.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData(
        "text/plain",
        JSON.stringify({
          id: folder.id,
          title: folder.title,
          type: "file",
        })
      );
      folderTitle.style.opacity = "0.5";

      // Hide any active tooltip immediately on drop
      if (activeTooltip) {
        console.log("started", activeTooltip);
        activeTooltip.style.display = "none";
        document.body.removeChild(activeTooltip);
        activeTooltip = null;
      }
    });
    folderTitle.addEventListener("dragend", () => {
      folderTitle.style.opacity = "1";

      // Hide any active tooltip immediately on drop
      if (activeTooltip) {
        activeTooltip.style.display = "none";
        document.body.removeChild(activeTooltip);
        activeTooltip = null;
      }
    });
  } else if (folder.type === "folder") {
    folderTitle.addEventListener("dragover", (e) => {
      e.preventDefault();
      folderTitle.style.backgroundColor = "rgb(100, 100, 100)";

      // Hide any active tooltip immediately on drop
      if (activeTooltip) {
        activeTooltip.style.display = "none";
        document.body.removeChild(activeTooltip);
        activeTooltip = null;
      }
    });
    folderTitle.addEventListener("dragleave", () => {
      folderTitle.style.backgroundColor = backgroundColor;

      // Hide any active tooltip immediately on drop
      if (activeTooltip) {
        activeTooltip.style.display = "none";
        document.body.removeChild(activeTooltip);
        activeTooltip = null;
      }
    });
    folderTitle.addEventListener("drop", (e) => {
      e.preventDefault();
      folderTitle.style.backgroundColor = backgroundColor;

      // Hide any active tooltip immediately on drop
      if (activeTooltip) {
        activeTooltip.style.display = "none";
        document.body.removeChild(activeTooltip);
        activeTooltip = null;
      }

      try {
        const draggedItem = JSON.parse(e.dataTransfer.getData("text/plain"));
        if (draggedItem.type === "file") {
          chrome.storage.local.get(["user"], (result) => {
            if (!result.user) {
              console.warn("No user logged in.");
              return;
            }

            const user_id = result.user.id;
            const chatId = draggedItem?.id;
            const newFolderId = folder?.id;

            if (!chatId || !newFolderId) {
              console.warn("Invalid chat or folder ID.");
              return;
            }

            // 🔹 Fetch latest chats and chatFolders
            chrome.runtime.sendMessage(
              { action: "getData", user_id },
              (response) => {
                if (response.error) {
                  console.error("Error fetching data:", response.error);
                  return;
                }

                console.log("Fetched Latest Data:", response);

                // 🔹 Check if the chat exists in `chats`
                const chatExistsInChats = response.chats.some(
                  (chat) => chat.id === chatId
                );

                if (!chatExistsInChats) {
                  console.log(
                    `Chat ${chatId} does not exist. Saving new chat...`
                  );

                  const newChat = {
                    title: draggedItem?.title,
                    type: "file",
                    link: draggedItem?.link,
                    user_id: user_id,
                  };

                  // 🔹 Save the chat first
                  chrome.runtime.sendMessage(
                    { action: "saveChat", chat: newChat },
                    (chatResponse) => {
                      if (chatResponse.error) {
                        console.error("Error saving chat:", chatResponse.error);
                      } else {
                        console.log(
                          "Chat saved successfully:",
                          chatResponse.data
                        );

                        // Get the actual chat ID from the response
                        const savedChatId = chatResponse?.data[0]?.id;
                        console.log("Saved Chat ID:", savedChatId);

                        if (!savedChatId) {
                          console.error("Chat ID missing from response.");
                          return;
                        }

                        // 🔹 Now save chat-folder relationship
                        saveChatFolder(savedChatId, newFolderId, user_id);
                      }
                    }
                  );
                } else {
                  console.log(
                    `Chat ${chatId} already exists. Checking folder association...`
                  );

                  // 🔹 Check if chat is already in the folder
                  const chatExistsInFolder = response.chatFolders.some(
                    (chatFolder) =>
                      chatFolder.chat_id === chatId &&
                      chatFolder.folder_id === newFolderId
                  );

                  if (chatExistsInFolder) {
                    console.log(
                      `Chat ${chatId} already exists in folder ${newFolderId}. Updating...`
                    );

                    chrome.runtime.sendMessage(
                      {
                        action: "updateChatFolder",
                        chatId,
                        folderId: newFolderId,
                        user_id,
                      },
                      (updateResponse) => {
                        if (updateResponse.error) {
                          console.error(
                            "Error updating chat folder:",
                            updateResponse.error
                          );
                        } else {
                          console.log(
                            "Chat updated successfully:",
                            updateResponse.data
                          );
                          fetchData(); // Reload UI
                        }
                      }
                    );
                  } else {
                    console.log(
                      `Chat ${chatId} does not exist in folder ${newFolderId}. Saving new chat-folder link...`
                    );
                    saveChatFolder(chatId, newFolderId, user_id);
                  }
                }
              }
            );
          });

          // 🔹 Function to save chat-folder relationship
          function saveChatFolder(chatId, folderId, userId) {
            chrome.runtime.sendMessage(
              { action: "saveChatFolder", chatId, folderId, user_id: userId },
              (response) => {
                if (response.error) {
                  console.error("Error saving chat folder:", response.error);
                } else {
                  console.log(
                    "Chat linked to folder successfully:",
                    response.data
                  );
                  fetchData(); // Reload UI
                }
              }
            );
          }

          // 🔹 Helper function to save chat-folder association
          function saveChatFolder(chatId, folderId, userId) {
            chrome.runtime.sendMessage(
              { action: "saveChatFolder", chatId, folderId, user_id: userId },
              (response) => {
                if (response.error) {
                  console.error("Error saving chat folder:", response.error);
                } else {
                  console.log(
                    "Chat linked to folder successfully:",
                    response.data
                  );
                  fetchData(); // Reload UI after save
                }
              }
            );
          }
        }
      } catch (err) {
        console.error("Error processing drop:", err);
      }
    });
  }
  folderTitle.style.width = "100%";
  folderTitle.style.fontWeight = "600";

  let activeTooltip = null; // Store the active tooltip
  // Add tooltip for file type
  if (folder) {
    const tooltip = document.createElement("div");
    tooltip.style.cssText = `
      position: fixed;
      background-color: #1a1a1a;
      color: white;
      padding: 10px 15px;
      border-radius: 8px;
      font-size: 14px;
      pointer-events: none;
      z-index: 10000;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      border: 1px solid #333;
      display: none;
      max-width: 300px;
      word-wrap: break-word;
      backdrop-filter: blur(5px);
      transition: opacity 0.2s ease;
      opacity: 0;
    `;
    tooltip.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">${folder.title}</div>
    `;
    document.body.appendChild(tooltip);
    activeTooltip = tooltip;

    // 🔹 Remove tooltip when the user clicks anywhere outside folders/chats
    document.addEventListener("mousemove", (e) => {
      if (!e.target.closest(".folders")) {
        tooltip.style.display = "none";
      }
    });

    // 🔹 Remove tooltips when clicking anywhere on the page
    document.addEventListener("click", () => {
      tooltip.style.display = "none";
    });

    let isDragging = false;

    folderTitle.addEventListener("dragstart", () => {
      isDragging = true;
      tooltip.style.display = "none";

      console.log("dragkd", tooltip, folder);
    });

    folderTitle.addEventListener("dragend", () => {
      isDragging = false;
    });

    folderTitle.addEventListener("mousemove", (e) => {
      if (isDragging) return;
      tooltip.style.display = "block";
      tooltip.style.opacity = "1";

      // Calculate position to keep tooltip within viewport
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = e.pageX + 15;
      let top = e.pageY + 15;

      // Adjust horizontal position if tooltip would overflow viewport
      if (left + tooltipRect.width > viewportWidth) {
        left = e.pageX - tooltipRect.width - 15;
      }

      // Adjust vertical position if tooltip would overflow viewport
      if (top + tooltipRect.height > viewportHeight) {
        top = e.pageY - tooltipRect.height - 15;
      }

      tooltip.style.left = left + "px";
      tooltip.style.top = top + "px";
    });

    folderTitle.addEventListener("mouseleave", () => {
      if (isDragging) return;
      tooltip.style.opacity = "0";
      setTimeout(() => {
        tooltip.style.display = "none";
      }, 200);
    });
  }

  folderElement.appendChild(folderTitle);
  // Add hover effect
  folderTitle.addEventListener("mouseover", () => {
    folderTitle.style.opacity = "0.8";
  });
  folderTitle.addEventListener("mouseleave", () => {
    folderTitle.style.opacity = "1";
  });

  const subfolderContainer = document.createElement("div");
  subfolderContainer.style.cssText = `
  margin-left: 10px; display: flex; flex-direction: column;
  `;
  subfolderContainer.className = "subFolders";
  subfolderContainer.style.flexDirection = "column";
  subfolderContainer.style.borderLeftColor = "#ab68ff";
  subfolderContainer.style.borderLeftWidth = "2px";
  subfolderContainer.style.marginTop = "5px";
  renderFolders(folder.children, subfolderContainer, depth + 1);
  folderElement.appendChild(subfolderContainer);

  let isExpanded = true;
  folderTitle.addEventListener("click", () => {
    isExpanded = !isExpanded;
    subfolderContainer.style.display = isExpanded ? "flex" : "none";
    if(!folder.image){
      folderTitle.textContent = isExpanded
      ? folder.title.replace("📁", "📂")
      : folder.title.replace("📂", "📁");
    }
  });

  addContextMenu(folder, folderTitle, subfolderContainer, depth);

  if (folder.type === "file") {
    const notesContainer = document.createElement("div");
    notesContainer.setAttribute("data-notes-container", folder.id);

    notesContainer.style.cssText = `
      display: none;
      margin-top: 10px;
      padding: 10px;
      background: #1a1a1a;
      border-radius: 5px;
      transition: all 0.3s ease;
    `;

    const notesButton = document.createElement("button");
    notesButton.innerHTML = "▼";
    notesButton.title = "Show Notes";
    notesButton.style.cssText = `
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 2px 5px;
      margin-left: 5px;
      font-size: 12px;
      transition: transform 0.3s ease;
    `;

    let notesVisible = false;
    notesButton.addEventListener("click", () => {
      notesVisible = !notesVisible;
      notesContainer.style.display = notesVisible ? "block" : "none";
      notesButton.style.transform = notesVisible
        ? "rotate(180deg)"
        : "rotate(0)";
      notesButton.title = notesVisible ? "Close Notes" : "Show Notes";

      if (notesVisible) {
        loadNotes(folder.id);
      }
    });

    folderTitle.parentElement.appendChild(notesButton);
    folderElement.appendChild(notesContainer);
  }

  return folderElement;
}

function addContextMenu(folder, folderTitle, subfolderContainer, depth) {
  const menu = document.createElement("div");
  menu.style.cssText = `
  position: fixed;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 5px;
  padding: 5px 0;
  min-width: 150px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  z-index: 1000;
  animation: fadeIn 0.1s ease;
  flex-direction: column;
  `;

  menu.innerHTML = `
    <button class="contextOption" style="padding: 8px 12px;
    cursor: pointer;
    color: white;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.2s ease;
    font-size: 14px;">➕ Add Folder</button>

    <button class="contextOption" style="padding: 8px 12px;
    cursor: pointer;
    color: white;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.2s ease;
    font-size: 14px;">✏️ Rename</button>

    <button class="contextOption" style="padding: 8px 12px;
    cursor: pointer;
    color: white;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.2s ease;
    font-size: 14px;">🤖 Rename with AI</button>

    <button class="contextOption" style="padding: 8px 12px;
    cursor: pointer;
    color: white;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.2s ease;
    font-size: 14px;">🗑️ Delete</button>

    <button class="contextOption createNoteBtn" style="padding: 8px 12px;
    cursor: pointer;
    color: white;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.2s ease;
    font-size: 14px; ">📒 Create Note</button>

    <button class="contextOption changeColor" style="padding: 8px 12px;
    cursor: pointer;
    color: white;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.2s ease;
    font-size: 14px; ">🎨 Change Color</button>

    <button class="contextOption changeTextColor" style="padding: 8px 12px;
    cursor: pointer;
    color: white;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.2s ease;
    font-size: 14px; ">🎨 Change Text Color</button>

    <button class="contextOption aiColor" style="padding: 8px 12px;
    cursor: pointer;
    color: white;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.2s ease;
    font-size: 14px; ">🤖 Change Color with AI</button>

    <button class="contextOption changeIcon" style="padding: 8px 12px;
    cursor: pointer;
    color: white;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.2s ease;
    font-size: 14px; ">🎭 Change Icon</button>

    <button class="contextOption newTab" style="padding: 8px 12px;
    cursor: pointer;
    color: white;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.2s ease;
    font-size: 14px; ">↗️ Open chat in new tab</button>
  `;
  // Remove the "Add Folder" button if the item is a file
  if (folder.type === "file") {
    menu.querySelector("button").style.display = "none"; // Hide "Add Folder"
    menu.querySelector(".changeColor").style.display = "none"; // Hide "Create Note" for folders
    menu.querySelector(".aiColor").style.display = "none"; // Hide "Create Note" for folders
    menu.querySelector(".changeTextColor").style.display = "none"; // Hide "Change Text Color"
    menu.querySelector(".changeIcon").style.display = "none"; // Hide "Change Text Color"
  }

  if (folder.type === "folder") {
    menu.querySelector(".createNoteBtn").style.display = "none"; // Hide "Create Note" for folders
    menu.querySelector(".newTab").style.display = "none"; // Hide "Create Note" for folders
  }

  document.body.appendChild(menu);

  // Add animation styles
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);

  // Add mouse over and leave effects to context options
  const contextOptions = document.querySelectorAll(".contextOption");
  contextOptions.forEach((option) => {
    option.addEventListener("mouseover", () => {
      option.style.background = "#444";
    });
    option.addEventListener("mouseleave", () => {
      option.style.background = "transparent";
    });
  });

  folderTitle.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${event.clientX}px`;
    menu.style.display = "flex";
  });

  document.addEventListener("click", () => {
    menu.style.display = "none";
  });

  const [
    addSubfolderButton,
    renameButton,
    aiRenameButton,
    deleteFolderButton,
    createNoteButton,
    changeColorButton,
    changeTextColorButton,
    aiColorButton,
    changeIconButton,
    newTabButton,
  ] = menu.querySelectorAll(".contextOption");

  // Add Subfolder
  addSubfolderButton.addEventListener("click", () => {
    chrome.storage.local.get(["user"], (result) => {
      if (!result.user) {
        console.warn("No user logged in.");
        return;
      }

      if (depth >= 20) {
        alert("Maximum nesting depth is 3.");
        return;
      }

      const user_id = result?.user?.id;

      const name = prompt("Enter subfolder name:");
      const gener = colorGenerator(name)
      if (name && gener) {
        const newFolder = {
          title: `📁${name}`,
          type: "folder",
          children: null,
          parent_id: parseInt(sessionStorage.getItem("folderId")),
          user_id: user_id,
          bgColor: gener
        };

        // Save to Supabase
        saveFolder(newFolder);

        // folder.children.push({
        //   id: generateRandomId(),
        //   title: `📁${name}`,
        //   type: "folder",
        //   children: [],
        // });
        renderFolders(folderData, document.querySelector(".folders"));
        console.log("arr", folderData);
      }
    });
  });

  createNoteButton.onclick = () => {
    // contextMenu.remove();
    createNotesModal(folder.id, folder.link);
  };

  changeTextColorButton.onclick = () => {
    showTextColorPicker(folder, folderTitle);
  };

  changeIconButton.onclick = () => {
    showImagePicker(folder, folderTitle);
  };

  newTabButton.onclick = () => {
    window.open(folder.link, "_blank").focus();
  };

  changeColorButton.onclick = () => {
    showColorPicker(folder, folderTitle);
    console.log("cliked");
  };

  aiColorButton.onclick = async () => {
    const aiColor = await getAIColorSuggestion(folder.title);
    folderTitle.style.backgroundColor = aiColor;
    folderTitle.style.color = isColorDark(aiColor) ? "white" : "black";

    // Save the AI-suggested color
    chrome.storage.local.get(["folderColors"], (result) => {
      const folderColors = result.folderColors || {};
      folderColors[folder.id] = aiColor;
      chrome.storage.local.set({ folderColors });
    });

    console.log("clik");
  };

  // Rename Folder/File
  renameButton.addEventListener("click", () => {
    chrome.storage.local.get(["user"], (result) => {
      if (!result.user) {
        console.warn("No user logged in.");
        return;
      }
      const user_id = result?.user?.id;
      const newName = prompt("Enter new name:", folder.title.replace("📁", ""));
      if (newName) {
        folder.title = folder.type === "folder" ? `📁${newName}` : newName;

        // Update Supabase
        chrome.runtime.sendMessage(
          {
            action: "renameFoldersAndChats",
            itemId: folder.id,
            newTitle: newName,
            itemType: folder.type,
            user_id: user_id,
          },
          (response) => {
            if (response.error) {
              console.error("Error renaming item:", response.error);
            } else {
              console.log("Item renamed successfully:", response.data);
            }
          }
        );

        renderFolders(folderData, document.querySelector(".folders"));
        // Save updated folder data to storage
        chrome.storage.local.set({ folderData: folderData });
      }
    });
  });

  // Delete Folder/File
  deleteFolderButton.addEventListener("click", () => {
    // const parent = folderData.find((f) => f.children.includes(folder));
    // if (parent) parent.children = parent.children.filter((f) => f !== folder);
    // else folderData = folderData.filter((f) => f !== folder);

    chrome.storage.local.get(["user"], (result) => {
      if (!result.user) {
        console.warn("No user logged in.");
        return;
      }

      const user_id = result?.user?.id;

      if (folder.type === "folder") {
        // ✅ Handle folder deletion
        if (
          confirm(
            `Are you sure you want to delete "${folder.title}"? This will delete all subfolders and chats inside it.`
          )
        ) {
          deleteFolder(folder.id, user_id);
        }
      } else {
        // ✅ Handle folder deletion
        if (confirm(`Are you sure you want to delete "${folder.title}"?`)) {
          deleteChat(folder.id, user_id);
        }
      }

      renderFolders(folderData, document.querySelector(".folders"));
      // Save to storage after deleting folder
      chrome.storage.local.set({ folderData: folderData });
    });
  });
  // AI-based rename option
  aiRenameButton.addEventListener("click", () => {
    renameWithAI(folder?.title, folder?.id, folder?.type);
  });
}

function setupAddFolderButton(button) {
  const modal = document.createElement("div");
  modal.style.cssText = `
    position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%);
    background-color: #1a1a1a; padding: 20px; border-radius: 10px; z-index: 10000; 
    display: none; width: 300px; box-shadow: 0 4px 8px rgba(255,255,255,0.2);
    border: 1px solid #333;
  `;
  modal.innerHTML = `
    <p style="color: white; margin-bottom: 10px; text-align: center; font-weight: bold;">Enter folder name:</p>
    <input type="text" placeholder="New Folder" 
           style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #444; margin-bottom: 10px; font-size: 14px; background-color: #2a2a2a; color: white;">
    <button style="padding: 10px; width: 100%; background-color: #444; color: white; border-radius: 5px; cursor: pointer;">Save</button>
    <button id="cancelButton" style="padding: 10px; width: 100%; background-color: #333; color: white; border-radius: 5px; cursor: pointer; margin-top: 10px;">Cancel</button>
  `;

  document.body.appendChild(modal);

  const input = modal.querySelector("input");
  const saveButton = modal.querySelector("button");
  const cancelButton = modal.querySelector("#cancelButton");

  button.addEventListener("click", () => {
    modal.style.display = "block";
    input.focus(); // Focus the input field when the modal appears
  });

  saveButton.addEventListener("click", () => {
    chrome.storage.local.get(["user"], (result) => {
      if (!result.user) {
        console.warn("No user logged in.");
        return;
      }
      const name = input.value.trim();
      const gener = colorGenerator(name)

      console.log('h', gener)
      if (name) {
        const user_id = result?.user?.id;
        const newFolder = {
          title: `📁${name}`,
          type: "folder",
          children: null,
          user_id: user_id,
          bgColor: gener
        };

        console.log('new', newFolder)

        // Save to Supabase
        saveFolder(newFolder);

        // folderData.push({
        //   id: generateRandomId(),
        //   title: `📁${name}`,
        //   type: "folder",
        //   children: [],
        // });
        renderFolders(folderData, document.querySelector(".folders"));
        input.value = "";
        modal.style.display = "none";
        // Save to storage after adding folder
        chrome.storage.local.set({ folderData: folderData });
        console.log("arr", folderData);
      }
    });
  });

  cancelButton.addEventListener("click", () => {
    modal.style.display = "none";
  });
}

const observer2 = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) {
        const historyItems = node.matches("li.relative")
          ? [node]
          : Array.from(node.querySelectorAll("li.relative"));

        historyItems.forEach((item) => {
          if (item.firstChild) {
            // Make chat items draggable
            // console.log(item.firstChild.firstChild.href);
            item.firstChild.draggable = true;
            // Store tooltip reference
            let activeTooltip = null;

            item.firstChild.addEventListener("dragstart", (e) => {
              const chatTitle =
                item.firstChild.firstChild.firstChild.innerText.replace(
                  "+",
                  ""
                );
              const chatId = generateRandomId();
              e.dataTransfer.setData(
                "text/plain",
                JSON.stringify({
                  id: chatId,
                  title: chatTitle,
                  type: "file",
                  link: item.firstChild.firstChild.href,
                })
              );
              item.firstChild.style.opacity = "0.5";

              // Hide tooltip immediately during drag
              if (activeTooltip) {
                activeTooltip.style.display = "none";
                document.body.removeChild(activeTooltip);
                activeTooltip = null;
              }
            });

            item.firstChild.addEventListener("dragend", () => {
              item.firstChild.style.opacity = "1";

              item.firstChild.addEventListener("drop", () => {
                console.log("daks");
              });

              // Ensure tooltip is removed after drag ends
              if (activeTooltip) {
                activeTooltip.style.opacity = "0";
                setTimeout(() => {
                  activeTooltip.style.display = "none";
                  document.body.removeChild(activeTooltip);
                  activeTooltip = null;
                }, 200);
              }
            });

            // Add the Add button
            // Create button container
            const buttonContainer = document.createElement("div");
            buttonContainer.style.cssText = `
              display: none;
              grid-template-columns: 1fr 1fr;
              gap: 4px;
              width: 100%;
            `;

            // Add chat button
            const addChat = document.createElement("button");
            addChat.className = "add-chat-btn";
            addChat.innerText = "Add";
            addChat.style.cssText = `
              padding: 4px 8px;
              background-color: #2d2d2d;
              color: #ffffff;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
              transition: background-color 0.2s;
            `;

            // Bookmark button
            const bookmarkBtn = document.createElement("button");
            bookmarkBtn.className = "bookmark-btn";
            bookmarkBtn.style.cssText = `
              padding: 4px 8px;
              background-color: #2d2d2d;
              color: #ffffff;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
              transition: background-color 0.2s;
            `;

            // Ensure the parent container has relative positioning
            item.firstChild.style.position = "relative";
            item.style.transition = "0.5s all ease";

            // Add buttons to container
            buttonContainer.appendChild(addChat);
            buttonContainer.appendChild(bookmarkBtn);
            item.firstChild.appendChild(buttonContainer);

            // Check if chat is bookmarked and update button text
            const chatTitle =
              item.firstChild.firstChild.firstChild.innerText.replace("+", "");
            const chatLink = item.firstChild.firstChild.href;
            const isBookmarked = bookmarks.some((b) => b.link === chatLink);
            bookmarkBtn.innerText = isBookmarked
              ? "🌟Bookmarked"
              : "☆ Bookmark";

            // Bookmark button click handler
            bookmarkBtn.addEventListener("click", () => {
              chrome.storage.local.get(["user"], (result) => {
                if (!result.user) {
                  console.warn("No user logged in.");
                  return;
                }
                const isCurrentlyBookmarked = bookmarks.some(
                  (b) => b.link === chatLink
                );

                const user_id = result?.user?.id;

                if (isCurrentlyBookmarked) {
                  // Remove bookmark
                  bookmarks = bookmarks.filter((b) => b.link !== chatLink);
                  bookmarkBtn.innerText = "☆ Bookmark";
                } else {
                  const newBookmark = {
                    title: chatTitle,
                    link: chatLink,
                    user_id: user_id,
                  };
                  // Add bookmark
                  saveBookmark(newBookmark);

                  // bookmarks.push({
                  //   id: generateRandomId(),
                  //   title: chatTitle,
                  //   link: chatLink,
                  //   timestamp: new Date().toISOString(),
                  // });
                  bookmarkBtn.innerText = "🌟 Bookmarked";
                }

                // Save updated bookmarks
                // chrome.storage.local.set({ bookmarks: bookmarks });
                // console.log("Updated bookmarks:", bookmarks);

                // Update bookmarks display in UI
                updateBookmarksDisplay();
              });
            });

            // Get the current page URL
            const URL = window.location.href;

            addChat.addEventListener("click", () => {
              const name =
                item.firstChild.firstChild.firstChild.innerText.replace(
                  "+",
                  ""
                );

              localStorage.setItem("link", item.firstChild.firstChild.href);
              renderFolders(folderData, document.querySelector(".folders"));
              // const observer3 = new MutationObserver(
              //   (mutations, observerInstance) => {
              const targetElement = document.body;

              const modalContainer = document.createElement("div");
              modalContainer.style.width = "100%";
              modalContainer.style.height = "100%";
              modalContainer.style.backgroundColor = "transparent";
              modalContainer.style.position = "absolute";
              modalContainer.style.top = "0";
              modalContainer.style.left = "0";
              modalContainer.style.transition = "transform 0.3s ease"; // Add transition for smooth scaling
              modalContainer.style.transform = "scale(1)"; // Initial scale is 1

              targetElement.appendChild(modalContainer);

              const modalContainerBackground = document.createElement("div");
              modalContainerBackground.style.width = "100%";
              modalContainerBackground.style.height = "100%";
              modalContainerBackground.style.backgroundColor = "transparent"; // Semi-transparent background
              modalContainerBackground.style.position = "absolute";
              modalContainerBackground.style.top = "0";
              modalContainerBackground.style.left = "0";

              modalContainer.appendChild(modalContainerBackground);

              // Add an ID to the modal box to simulate existing modal content
              const modalBox = document.createElement("div");
              modalBox.id = "modalBoxId";
              modalBox.style.width = "500px";
              modalBox.style.height = "500px";
              modalBox.style.backgroundColor = "#1a1a1a";
              modalBox.style.borderRadius = "10px";
              modalBox.style.position = "absolute";
              modalBox.style.top = "50%";
              modalBox.style.left = "50%";
              modalBox.style.transform = "translate(-50%, -50%)";
              modalBox.style.padding = "20px";
              modalBox.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
              modalBox.style.display = "flex";
              modalBox.style.flexDirection = "column";
              modalBox.style.gap = "10px";
              modalContainer.appendChild(modalBox);

              // Search section
              const searchSection = document.createElement("div");
              searchSection.style.cssText = `
          width: 100%;
          padding: 10px 0;
        `;
              const searchInput = document.createElement("input");
              searchInput.type = "text";
              searchInput.placeholder = "Search folders...";
              searchInput.style.cssText = `
          width: 100%;
          padding: 8px;
          border-radius: 5px;
          border: 1px solid #444;
          background-color: #2a2a2a;
          color: white;
        `;
              searchInput.id = "modalFolderSearch";

              // Add search functionality
              searchInput.addEventListener("input", (e) => {
                const searchTerm = e.target.value.trim().toLowerCase();
                const allFolderElements = folderSection.querySelectorAll("div");

                allFolderElements.forEach((element) => {
                  const titleElement = element.querySelector("p");
                  if (titleElement) {
                    const folderName = titleElement.textContent.toLowerCase();
                    const parentElement = element.parentElement;

                    if (folderName.includes(searchTerm)) {
                      element.style.display = "flex";
                      // Show parent containers if there's a match
                      let parent = parentElement;
                      while (parent && !parent.isSameNode(folderSection)) {
                        parent.style.display = "flex";
                        parent = parent.parentElement;
                      }
                    } else {
                      // Only hide if none of the children match
                      const hasMatchingChild = Array.from(
                        element.querySelectorAll("p")
                      ).some((p) =>
                        p.textContent.toLowerCase().includes(searchTerm)
                      );
                      if (!hasMatchingChild) {
                        element.style.display = "none";
                      }
                    }
                  }
                });
              });

              searchSection.appendChild(searchInput);
              modalBox.appendChild(searchSection);

              // Folder content section
              const folderSection = document.createElement("div");
              folderSection.style.cssText = `
          flex: 1;
          overflow-y: auto;
          padding: 10px 0;
          border-top: 1px solid #333;
          border-bottom: 1px solid #333;
        `;
              modalBox.appendChild(folderSection);

              // Button section
              const buttonSection = document.createElement("div");
              buttonSection.style.cssText = `
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          padding: 10px 0;
        `;
              modalBox.appendChild(buttonSection);

              modalContainerBackground.addEventListener("click", () => {
                if (document.getElementById("modalBoxId")) {
                  modalContainer.style.transform = "scale(0)"; // Trigger scale animation to 0
                  setTimeout(() => {
                    modalContainer.remove(); // Remove after animation completes
                    console.log("Animation complete, modal removed");
                  }, 500); // Match timeout with animation duration
                }
              });

              if (document.getElementById("modalBoxId")) {
                renderNestedFolders(folderData, folderSection); // Call to set up the UI

                const close = document.createElement("button");
                close.innerText = "Close";
                close.style.cssText = `
            padding: 8px 16px;
            background-color: #333;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          `;

                // Create save button
                const saveButton = document.createElement("button");
                saveButton.innerText = "Save";
                saveButton.style.cssText = `
            padding: 8px 16px;
            background-color: #2196F3; /* Changed to blue */
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          `;

                buttonSection.appendChild(saveButton);
                buttonSection.appendChild(close);

                saveButton.addEventListener("click", () => {
                  chrome.storage.local.get(["user"], (result) => {
                    if (!result.user) {
                      console.warn("No user logged in.");
                      return;
                    }

                    const user_id = result?.user?.id;

                    if (checkBox.length > 0) {
                      const selectedFolders = findFoldersById(
                        folderData,
                        checkBox
                      );

                      const newChat = {
                        title: name,
                        type: "file",
                        children: null,
                        link: localStorage.getItem("link"),
                        user_id: user_id,
                      };

                      // 🔹 Save chat to Supabase first
                      chrome.runtime.sendMessage(
                        { action: "saveChat", chat: newChat },
                        (response) => {
                          if (response.error) {
                            console.error(
                              "Error saving chat to Supabase:",
                              response.error
                            );
                          } else {
                            console.log(
                              "Chat successfully saved:",
                              response.data
                            );

                            // 🔹 Now, get the actual chat ID from Supabase
                            const chatId = response?.data[0]?.id; // Supabase returns an array
                            console.log(response, "respo");

                            if (!chatId) {
                              console.error(
                                "Chat ID not received from Supabase"
                              );
                              return;
                            }

                            // 🔹 Now link the chat to the selected folders
                            selectedFolders.forEach((folder) => {
                              chrome.storage.local.get(["user"], (result) => {
                                if (!result.user) {
                                  console.warn("No user logged in.");
                                  return;
                                }

                                const user_id = result?.user?.id;
                                chrome.runtime.sendMessage(
                                  {
                                    action: "saveChatToFolder",
                                    chatId: chatId, // Use actual chat ID from Supabase
                                    folderId: folder.id,
                                    user_id: user_id,
                                  },
                                  (folderResponse) => {
                                    if (folderResponse.error) {
                                      console.error(
                                        "Error saving chat to folder:",
                                        folderResponse.error
                                      );
                                    } else {
                                      console.log(
                                        "Chat successfully linked to folder:",
                                        folderResponse.data
                                      );
                                    }
                                  }
                                );

                                // Add chat inside the folder in the UI
                                // folder.children.unshift({
                                //   id: chatId,
                                //   title: newChat.title,
                                //   type: "file",
                                //   children: [],
                                //   link: newChat.link,
                                // });
                              });
                            });

                            // Reset checkboxes
                            checkBox = [];

                            // Update UI
                            renderFolders(
                              folderData,
                              document.querySelector(".folders")
                            );
                            chrome.storage.local.set({
                              folderData: folderData,
                            });

                            // Close modal
                            modalContainer.style.transform = "scale(0)";
                            setTimeout(() => {
                              modalContainer.remove();
                            }, 500);
                          }
                        }
                      );
                    } else {
                      alert("Please select at least one folder");
                    }
                  });
                });

                close.addEventListener("click", () => {
                  if (document.getElementById("modalBoxId")) {
                    modalContainer.style.transform = "scale(0)"; // Trigger scale animation to 0
                    setTimeout(() => {
                      modalContainer.remove(); // Remove after animation completes
                      console.log("Animation complete, modal removed");
                    }, 500); // Match timeout with animation duration
                  }
                });

                // observerInstance.disconnect(); // Disconnect observer after initialization
              }
              // }
              // );

              // Observe changes in the DOM to locate the target element
              // observer3.observe(document.body, { childList: true, subtree: true });
              console.log("arr", folderData);
            });
            addChat.addEventListener("mouseover", () => {
              addChat.style.backgroundColor = "rgb(100, 100, 100)";
            });
            addChat.addEventListener("mouseleave", () => {
              addChat.style.backgroundColor = "transparent";
            });

            item.addEventListener("mouseover", () => {
              buttonContainer.style.display = "grid";
              item.style.height = "70px";
            });
            item.addEventListener("mouseleave", () => {
              buttonContainer.style.display = "none";
              item.style.height = "unset";
            });
          }
        });
      }
    });
  });
});

// Observe changes in the DOM
observer2.observe(document.body, { childList: true, subtree: true });

// Helper function to find folders by their IDs
function findFoldersById(folders, ids) {
  let found = [];

  function search(items) {
    items.forEach((item) => {
      if (item.type === "folder" && ids.includes(item.id)) {
        found.push(item);
      }
      if (item.children && item.children.length > 0) {
        search(item.children);
      }
    });
  }

  search(folders);
  return found;
}

function renderNestedFolders(folderData, container) {
  console.log("fol", folderData);
  container.innerHTML = ""; // Clear the container

  folderData.forEach((item) => {
    // Create the folder element
    const folderElement = document.createElement("div");
    folderElement.style.cssText = `
      display: flex; flex-direction: column; margin-left: 10px; margin-top: 10px;
    `;

    // Create a row container for checkbox and title
    const folderRow = document.createElement("div");
    folderRow.style.cssText = `
      display: flex; align-items: center; gap: 8px;
    `;

    // Conditionally create checkbox only if type is 'folder'
    if (item.type === "folder") {
      const folderCheckbox = document.createElement("input");
      folderCheckbox.type = "checkbox";
      folderCheckbox.style.cssText = `
        cursor: pointer; width: 16px; height: 16px;
      `;
      folderCheckbox.style.borderRadius = "3px";
      folderCheckbox.style.accentColor =
        "#9C27B0"; /* Changed to deeper purple */
      folderCheckbox.style.backgroundColor = "#2f2f2f";
      folderCheckbox.addEventListener("click", () => {
        checkBox.push(item.id);
        if (folderCheckbox.checked) {
          folderCheckbox.style.backgroundColor = "#ab68ff";
        } else {
          folderCheckbox.style.backgroundColor = "#2f2f2f";
        }
      });
      // Append checkbox to row
      folderRow.appendChild(folderCheckbox);

      folderCheckbox.addEventListener("click", () => {
        checkBox.push(item.id);
        console.log("ar", checkBox);
      });
      console.log("af", checkBox);
    }

    // Create the title
    const folderTitle =
      item.type === "folder"
        ? document.createElement("p")
        : document.createElement("a");
    folderTitle.textContent = item.title;
    const backgroundColor =
      item.type === "folder" ? colorGenerator(item.title) : "black";
    const textColor =
      item.type === "folder"
        ? isColorDark(backgroundColor)
          ? "white"
          : "black"
        : "white";
    folderTitle.style.cssText = `
      background-color: ${backgroundColor}; 
      padding: 5px; 
      border-radius: 4px;
      cursor: pointer; 
      font-size: 14px; 
      color: ${textColor}; 
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    `;
    folderTitle.style.width = "100%";
    folderTitle.style.fontWeight = "600";

    // Add toggle functionality for children
    let isExpanded = true;
    const childrenContainer = document.createElement("div");
    childrenContainer.style.cssText =
      "margin-left: 30px; display: flex; flex-direction: column;";
    folderTitle.addEventListener("click", () => {
      isExpanded = !isExpanded;
      childrenContainer.style.display = isExpanded ? "block" : "none";
    });

    // Append title to row
    folderRow.appendChild(folderTitle);

    folderElement.appendChild(folderRow); // Add row to folder element
    folderElement.appendChild(childrenContainer); // Add children container to folder element

    // Recursively render children if present
    if (item.children && item.children.length > 0) {
      renderNestedFolders(item.children, childrenContainer);
    }

    // Append to the main container
    container.appendChild(folderElement);
  });
}

console.log("arr", folderData);

function highlightText(element, searchTerm) {
  const text = element.textContent;
  if (searchTerm && text.toLowerCase().includes(searchTerm.toLowerCase())) {
    const regex = new RegExp(`(${searchTerm})`, "gi");
    element.innerHTML = text.replace(
      regex,
      '<span style="background-color: yellow; color: black">$1</span>'
    );
    return true;
  }
  element.innerHTML = text;
  return false;
}

function searchFolders(searchTerm) {
  const allFolderElements = document.querySelectorAll(".folders div");
  let hasMatch = false;

  allFolderElements.forEach((folderElement) => {
    const titleElement = folderElement.querySelector("p"); // Get the folder title
    const childrenContainers = folderElement.querySelectorAll(".subFolders"); // Get all nested subfolders

    let localMatch = false; // Track if the current folder or any of its children matches

    if (titleElement) {
      // Check if the folder title matches the search term
      localMatch = highlightText(titleElement, searchTerm);
    }

    // Recursively check subfolders
    childrenContainers.forEach((container) => {
      const childMatches = searchSubfolders(container, searchTerm); // Check child folders
      if (childMatches) {
        container.style.display = "flex"; // Show matching subfolder
        localMatch = true; // Propagate match upwards
      }
    });

    if (localMatch) {
      hasMatch = true; // If any match is found, set hasMatch to true
    }
  });

  return hasMatch;
}

function searchSubfolders(container, searchTerm) {
  let hasChildMatch = false;
  const subFolders = container.querySelectorAll(":scope > div"); // Get immediate subfolders

  subFolders.forEach((subFolder) => {
    const titleElement = subFolder.querySelector("p"); // Get the title
    const nestedContainers = subFolder.querySelectorAll(".subFolders"); // Nested subfolders
    let localMatch = false;

    if (titleElement && searchTerm) {
      const text = titleElement.textContent;
      if (text.toLowerCase().startsWith(searchTerm.toLowerCase())) {
        const regex = new RegExp(`^(${searchTerm})`, "gi");
        titleElement.innerHTML = text.replace(
          regex,
          '<span style="background-color: yellow; color: black">$1</span>'
        );
        localMatch = true;
      } else {
        titleElement.innerHTML = text;
      }
    }

    // Recursively check deeper nested subfolders
    nestedContainers.forEach((nestedContainer) => {
      if (nestedContainer.style.display === "none") {
        nestedContainer.style.display = "flex";
      }
      const childMatch = searchSubfolders(nestedContainer, searchTerm);
      if (childMatch) {
        localMatch = true; // Propagate match upwards
      }
    });

    if (localMatch) {
      subFolder.style.display = "flex";
      hasChildMatch = true;
    }
  });

  return hasChildMatch;
}

function setupSearchBar() {
  const searchInput = document.getElementById("folderSearch");
  let searchTimeout = null;
  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.trim();

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      // Create a summary of your data (you can adjust this as needed)
      const folderTitles = folderData
        .map((folder) => {
          const titles = [];
          const traverse = (folder) => {
            titles.push(folder.title);
            if (folder.children) {
              folder.children.forEach(traverse);
            }
          };
          traverse(folder);
          return titles.join(", ");
        })
        .join(", ");

      const context = `Folders: ${folderTitles}`;
      const prompt = `${context}\nonly give me the folder name(only name no other text) closed to this query: ${searchTerm}`;

      askDeepSeek(prompt, (response) => {
        const match = response.match(/\*\*(.*?)\*\*/);
        let extracted = match ? match[1] : response;
        console.log("AI Search Result: " + extracted);

        if (extracted) searchFolders(extracted);
      });
    }, 700); // Debounce by 700ms

    searchFolders(searchTerm);
  });
}

function removeItemFromFolder(folders, itemId) {
  for (let i = 0; i < folders.length; i++) {
    if (folders[i].id === itemId) {
      folders.splice(i, 1);
      return true;
    }
    if (folders[i].children && folders[i].children.length > 0) {
      if (removeItemFromFolder(folders[i].children, itemId)) {
        return true;
      }
    }
  }
  return false;
}

function setupFolderUI(foldersContainer) {
  setupSearchBar();
  renderFolders(folderData, foldersContainer); // Display folder structure
  updateBookmarksDisplay(); // Display bookmarks
}

function updateBookmarksDisplay() {
  const bookmarksList = document.querySelector(".bookmarks-list");
  if (!bookmarksList) return;

  bookmarksList.innerHTML = "";

  bookmarks.forEach((bookmark) => {
    const bookmarkElement = document.createElement("a");
    bookmarkElement.href = bookmark.link;
    bookmarkElement.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 2px;
      background-color: #2a2a2a;
      border-radius: 4px;
      color: white;
      text-decoration: none;
      font-size: 14px;
    `;

    bookmarkElement.innerHTML = `
      <span>🌟</span>
      <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${bookmark.title}
      </span>
      <button class="remove-bookmark" style="
        background: none;
        border: none;
        color: #F44336; /* Changed to material design red */
        cursor: pointer;
        padding: 4px;
        font-size: 20px;
      ">×</button>
    `;

    const removeBtn = bookmarkElement.querySelector(".remove-bookmark");
    removeBtn.addEventListener("click", (e) => {
      chrome.storage.local.get(["user"], (result) => {
        if (!result.user) {
          console.warn("No user logged in.");
          return;
        }
        const user_id = result?.user?.id;
        e.preventDefault();
        e.stopPropagation();
        deleteBookmark(bookmark?.id, user_id);
        // bookmarks = bookmarks.filter((b) => b.id !== bookmark.id);
        chrome.storage.local.set({ bookmarks: bookmarks });
        updateBookmarksDisplay();
      });
    });

    bookmarksList.appendChild(bookmarkElement);
  });
}

// Helper function to remove items from folders
function removeItemFromFolder(folders, itemId) {
  for (let i = 0; i < folders.length; i++) {
    if (folders[i].id === itemId) {
      folders.splice(i, 1);
      return true;
    }
    if (folders[i].children && folders[i].children.length > 0) {
      if (removeItemFromFolder(folders[i].children, itemId)) {
        return true;
      }
    }
  }
  return false;
}

function createNotesModal(chatId, link) {
  const modal = document.createElement("div");
  modal.className = "notes-modal";
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #1a1a1a;
    padding: 20px;
    border-radius: 10px;
    z-index: 10000;
    width: 500px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    border: 1px solid #333;
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  `;

  const title = document.createElement("h2");
  title.textContent = "Create Note";
  title.style.cssText = `
    color: white;
    margin: 0;
    font-size: 1.5em;
  `;

  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "×";
  closeBtn.style.cssText = `
    background: none;
    border: none;
    color: #999;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  `;

  const textarea = document.createElement("textarea");
  textarea.style.cssText = `
    width: 100%;
    height: 200px;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 5px;
    padding: 10px;
    color: white;
    font-size: 14px;
    resize: vertical;
    margin-bottom: 15px;
  `;

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save Note";
  saveBtn.style.cssText = `
    background: #2196F3;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
  `;

  header.appendChild(title);
  header.appendChild(closeBtn);
  modal.appendChild(header);
  modal.appendChild(textarea);
  modal.appendChild(saveBtn);

  closeBtn.onclick = () => modal.remove();
  saveBtn.onclick = () => {
    const noteText = textarea.value.trim();
    if (noteText) {
      saveNote(chatId, noteText, link);
      modal.remove();
    }
  };

  document.body.appendChild(modal);
}

function saveNote(chatId, content, link) {
  chrome.storage.local.get(["user"], (result) => {
    if (!result.user) {
      console.warn("No user logged in.");
      return;
    }

    const note = {
      chat_id: chatId,
      content: content,
      user_id: result.user.id,
      link: link,
    };

    chrome.runtime.sendMessage({ action: "saveNote", note }, (response) => {
      if (response.error) {
        console.error("Error saving note:", response.error);
      } else {
        console.log("Note saved successfully:", response.data);
        loadNotes(chatId); // Refresh notes display
      }
    });
  });
}

function loadNotes(chatId) {
  chrome.storage.local.get(["user"], (result) => {
    if (!result.user) {
      console.warn("No user logged in.");
      return;
    }

    chrome.runtime.sendMessage(
      {
        action: "getNotes",
        chatId: chatId,
        userId: result.user.id,
      },
      (response) => {
        if (response.error) {
          console.error("Error loading notes:", response.error);
        } else {
          displayNotes(chatId, response.data);
        }
      }
    );
  });
}

function displayNotes(chatId, notes) {
  const notesContainer = document.querySelector(
    `[data-notes-container="${chatId}"]`
  );
  if (!notesContainer) return;

  notesContainer.innerHTML = "";

  notes.forEach((note) => {
    const noteElement = document.createElement("div");
    noteElement.className = "note-item";
    noteElement.setAttribute("data-note-id", note.id);
    noteElement.style.cssText = `
      background: #2a2a2a;
      padding: 10px;
      margin-bottom: 8px;
      border-radius: 5px;
      position: relative;
      animation: slideDown 0.3s ease;
      border: 1px solid #444;
      transition: all 0.2s ease;
      cursor: pointer;
    `;

    // Add hover effect
    noteElement.addEventListener("mouseover", () => {
      noteElement.style.borderColor = "#666";
      noteElement.style.transform = "translateY(-1px)";
    });

    noteElement.addEventListener("mouseleave", () => {
      noteElement.style.borderColor = "#444";
      noteElement.style.transform = "translateY(0)";
    });

    const noteContentWrapper = document.createElement("div");
    noteContentWrapper.style.cssText = `
      color: white;
      margin: 0 0 5px 0;
      font-size: 14px;
      line-height: 1.5;
      position: relative;
    `;

    const noteContent = document.createElement("span");
    const showMoreSpan = document.createElement("span");
    showMoreSpan.style.cssText = `
      color: #2196F3;
      cursor: pointer;
      margin-left: 4px;
      user-select: none;
    `;

    // Context menu for right-click
    noteElement.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showNoteContextMenu(e, note);
    });

    // Check if content needs show more button
    const tempDiv = document.createElement("div");
    tempDiv.style.cssText = `
      position: absolute;
      visibility: hidden;
      height: auto;
      width: ${noteElement.offsetWidth}px;
      font-size: 14px;
      line-height: 1.5;
    `;
    tempDiv.textContent = note.content;
    document.body.appendChild(tempDiv);

    const lineHeight = parseInt(getComputedStyle(tempDiv).lineHeight);
    const maxHeight = lineHeight * 2;

    if (tempDiv.offsetHeight > maxHeight) {
      let expanded = false;
      const words = note.content.split(" ");
      const truncatedContent = words.slice(0, 15).join(" ");

      function updateContent() {
        if (expanded) {
          noteContent.textContent = note.content;
          showMoreSpan.textContent = " ...show less";
        } else {
          noteContent.textContent = truncatedContent;
          showMoreSpan.textContent = " ...show more";
        }
      }

      showMoreSpan.onclick = () => {
        expanded = !expanded;
        updateContent();
      };

      updateContent();
    } else {
      noteContent.textContent = note.content;
      showMoreSpan.style.display = "none";
    }

    document.body.removeChild(tempDiv);

    noteContentWrapper.appendChild(noteContent);
    noteContentWrapper.appendChild(showMoreSpan);
    noteElement.appendChild(noteContentWrapper);

    notesContainer.appendChild(noteElement);
  });
}

// Add this new function for the context menu
function showNoteContextMenu(event, note) {
  // Remove any existing context menus
  const existingMenu = document.querySelector(".note-context-menu");
  if (existingMenu) {
    existingMenu.remove();
  }

  const contextMenu = document.createElement("div");
  contextMenu.className = "note-context-menu";
  contextMenu.style.cssText = `
    position: fixed;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 5px;
    padding: 5px 0;
    min-width: 150px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    z-index: 1000;
    animation: fadeIn 0.1s ease;
  `;

  const menuItems = [
    {
      icon: "📋",
      text: "Copy",
      action: () => navigator.clipboard.writeText(note.content),
    },
    {
      icon: "✏️",
      text: "Edit",
      action: () => updateNote(note.id, note.content),
    },
    {
      icon: "🤖",
      text: "Rewrite with AI",
      action: () => rewriteWithAI(note.id, note.content),
    },
    {
      icon: "⏰",
      text: "Set Reminder",
      action: () => createReminderModal(note.id, note.content, note.link),
    },
    { icon: "🗑️", text: "Delete", action: () => deleteNote(note.id) },
  ];

  menuItems.forEach((item) => {
    const menuItem = document.createElement("div");
    menuItem.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      color: white;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s ease;
      font-size: 14px;
    `;

    menuItem.innerHTML = `${item.icon} ${item.text}`;

    menuItem.addEventListener("mouseover", () => {
      menuItem.style.background = "#444";
    });

    menuItem.addEventListener("mouseleave", () => {
      menuItem.style.background = "transparent";
    });

    menuItem.addEventListener("click", () => {
      item.action();
      contextMenu.remove();
    });

    contextMenu.appendChild(menuItem);
  });

  // Position the menu
  contextMenu.style.left = `${event.pageX}px`;
  contextMenu.style.top = `${event.pageY}px`;

  // Add click outside listener
  document.addEventListener("click", function closeMenu(e) {
    if (!contextMenu.contains(e.target)) {
      contextMenu.remove();
      document.removeEventListener("click", closeMenu);
    }
  });

  document.body.appendChild(contextMenu);

  // Add animation styles
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

function updateNote(noteId, currentContent) {
  const modal = document.createElement("div");
  modal.className = "update-note-modal";
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #1a1a1a;
    padding: 20px;
    border-radius: 10px;
    z-index: 10000;
    width: 500px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  `;

  const textarea = document.createElement("textarea");
  textarea.value = currentContent;
  textarea.style.cssText = `
    width: 100%;
    height: 200px;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 5px;
    padding: 10px;
    color: white;
    font-size: 14px;
    resize: vertical;
    margin-bottom: 15px;
  `;

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save Changes";
  saveBtn.style.cssText = `
    background: #2196F3;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
    margin-right: 10px;
  `;

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.cssText = `
    background: #666;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
  `;

  modal.appendChild(textarea);
  modal.appendChild(saveBtn);
  modal.appendChild(cancelBtn);

  saveBtn.onclick = () => {
    const newContent = textarea.value.trim();
    if (newContent) {
      chrome.runtime.sendMessage(
        { action: "updateNote", noteId, content: newContent },
        (response) => {
          if (response.error) {
            console.error("Error updating note:", response.error);
          } else {
            console.log("Note updated successfully:", response.data);
            loadNotes(response.data.chat_id);
          }
        }
      );
      modal.remove();
    }
  };

  cancelBtn.onclick = () => modal.remove();
  document.body.appendChild(modal);
}

function rewriteWithAI(noteId, currentContent) {
  // Get the note element
  const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
  if (!noteElement) return;

  // Create and add loader
  const loader = document.createElement("span");
  loader.className = "loader";
  loader.style.cssText = `
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-left: 5px;
    vertical-align: middle;
  `;

  // Add animation styles
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
  // Disable button and show loader

  noteElement.appendChild(loader);

  const prompt = `Please rewrite and improve this note(only give the improved version in response no any thing else msg, symbol) while maintaining its core meaning: "${currentContent}"`;

  chrome.runtime.sendMessage({ action: "askDeepSeek", prompt }, (response) => {
    // Remove loader and restore button
    if (loader && loader.parentNode) {
      loader.parentNode.removeChild(loader);
    }

    if (response) {
      chrome.runtime.sendMessage(
        { action: "updateNote", noteId, content: response },
        (updateResponse) => {
          if (updateResponse.error) {
            alert("Sorry! AI is sleeping.");
          } else {
            console.log("Note updated successfully:", updateResponse.data);
            loadNotes(updateResponse.data.chat_id);
          }
        }
      );
    }
  });
}

function deleteNote(noteId) {
  if (confirm("Are you sure you want to delete this note?")) {
    chrome.runtime.sendMessage({ action: "deleteNote", noteId }, (response) => {
      if (response.error) {
        console.error("Error deleting note:", response.error);
      } else {
        console.log("Note deleted successfully");
        loadNotes(response.data.chat_id);
      }
    });
  }
}

function createReminderModal(noteId, noteContent, link) {
  const modal = document.createElement("div");
  modal.className = "reminder-modal";
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #1a1a1a;
    padding: 20px;
    border-radius: 10px;
    z-index: 10000;
    width: 400px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    border: 1px solid #333;
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  `;

  const title = document.createElement("h2");
  title.textContent = "Set Reminder";
  title.style.cssText = `
    color: white;
    margin: 0;
    font-size: 1.5em;
  `;

  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "×";
  closeBtn.style.cssText = `
    background: none;
    border: none;
    color: #999;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  `;

  const form = document.createElement("form");
  form.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 15px;
  `;

  const dateTimeInput = document.createElement("input");
  dateTimeInput.type = "datetime-local";
  dateTimeInput.style.cssText = `
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 5px;
    padding: 10px;
    color: white;
    font-size: 14px;
  `;

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Set Reminder";
  saveBtn.style.cssText = `
    background: #2196F3;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
  `;

  // Set minimum date to now
  const now = new Date();
  const tzoffset = now.getTimezoneOffset() * 60000;
  const localISOTime = new Date(Date.now() - tzoffset)
    .toISOString()
    .slice(0, 16);
  dateTimeInput.min = localISOTime;

  form.appendChild(dateTimeInput);
  form.appendChild(saveBtn);

  header.appendChild(title);
  header.appendChild(closeBtn);
  modal.appendChild(header);
  modal.appendChild(form);

  closeBtn.onclick = () => modal.remove();

  form.onsubmit = (e) => {
    e.preventDefault();
    const reminderTime = new Date(dateTimeInput.value).getTime();

    chrome.runtime.sendMessage(
      {
        action: "setReminder",
        reminder: {
          noteId,
          noteContent,
          reminderTime,
          link,
        },
      },
      (response) => {
        if (response.error) {
          console.error("Error setting reminder:", response.error);
        } else {
          console.log("Reminder set successfully:", response.data);
          modal.remove();
        }
      }
    );
  };

  document.body.appendChild(modal);
}

let folderData = []; // Array to store folder structure

// Function to generate colors dynamically based on folder name
function colorGenerator(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  let r = (hash & 0xff0000) >> 16;
  let g = (hash & 0x00ff00) >> 8;
  let b = hash & 0x0000ff;

  // Ensure colors are bright and provide contrast
  r = (r + 100) % 255;
  g = (g + 150) % 255;
  b = (b + 200) % 255;

  // Increase brightness for dark backgrounds
  r = Math.min(255, r + 50);
  g = Math.min(255, g + 50);
  b = Math.min(255, b + 50);

  return rgb(${r}, ${g}, ${b});
}

// create a random id generator
function generateRandomId() {
  return Math.floor(Math.random() * 1000000);
}

// Function to calculate the brightness of a color (to check if it's dark or light)
function isColorDark(rgb) {
  const [r, g, b] = rgb.match(/\d+/g).map(Number);
  const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b; // Using the luminance formula
  return brightness < 128; // If the brightness is less than 128, it's considered dark
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

function createUI(targetElement) {
  const container = document.createElement("div");
  container.style.cssText = 
    padding: 10px; margin: 5px 0; z-index: 1000; font-weight: 500;
  ;

  container.innerHTML = 
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <div>
        <p>Bookmarks</p>
        <div></div>
      </div>
      <div style="position: relative;">
        <p>Folders</p>
        <button 
          id="addFolder"
          style="padding: 5px; font-size: 14px; background-color: rgb(45, 45, 45); width: 100%; color: white; border: none; border-radius: 5px;"
        >
          📁 New Folder
        </button>
        <div class="folders" style="display: flex; flex-direction: column;"></div>
      </div>
    </div>
  ;

  targetElement.insertAdjacentElement("afterend", container);

  setupFolderUI(container.querySelector(".folders")); // Initialize folder system
  setupAddFolderButton(container.querySelector("#addFolder")); // Handle "Add Folder" button
}

function renderFolders(folderArray, container, depth = 0) {
  container.innerHTML = ""; // Clear existing folders

  folderArray.forEach((folder, index) => {
    const folderElement = createFolderElement(folder, index, depth);
    container.appendChild(folderElement);
  });
}

function createFolderElement(folder, index, depth) {
  const folderElement = document.createElement("div");
  folderElement.style.marginLeft = "5px";

  const folderTitle = document.createElement("p");
  folderTitle.textContent = folder.title;
  const backgroundColor = colorGenerator(folder.title);
  folderTitle.style.cssText = 
    background-color: ${
      folder.type === "folder" ? backgroundColor : "black"
    }; /* Use colorGenerator function */
    padding: 5px; border-radius: 5px; color: ${
      folder.type === "folder"
        ? isColorDark(backgroundColor)
          ? "white"
          : "black"
        : "white"
    }; cursor: pointer;
    margin-top: 10px; font-size: 14px;
  ;

  folderElement.appendChild(folderTitle);

  // Add hover effect
  folderTitle.addEventListener("mouseover", () => {
    folderTitle.style.backgroundColor = "rgb(100, 100, 100)";
  });
  folderTitle.addEventListener("mouseleave", () => {
    folderTitle.style.backgroundColor =
      folder.type === "folder" ? backgroundColor : "black";
  });

  const subfolderContainer = document.createElement("div");
  subfolderContainer.style.cssText = 
    margin-left: 10px; display: flex; flex-direction: column;
  ;
  renderFolders(folder.children, subfolderContainer, depth + 1);
  folderElement.appendChild(subfolderContainer);

  let isExpanded = true;
  folderTitle.addEventListener("click", () => {
    isExpanded = !isExpanded;
    subfolderContainer.style.display = isExpanded ? "flex" : "none";
    folderTitle.textContent = isExpanded
      ? folder.title.replace("📁", "📂")
      : folder.title.replace("📂", "📁");
  });

  addContextMenu(folder, folderTitle, subfolderContainer, depth);

  return folderElement;
}

function addContextMenu(folder, folderTitle, subfolderContainer, depth) {
  const menu = document.createElement("div");
  menu.style.cssText = 
    position: absolute; background-color: rgb(244, 223, 38); color: black; border-radius: 5px;
    display: none; flex-direction: column; gap: 5px; padding: 10px; z-index: 10000;
    border: 2px solid white;
  ;

  menu.innerHTML = 
    <button class="contextOption">➕ Add folder</button>
    <button class="contextOption">❌ Delete Folder</button>
  ;

  document.body.appendChild(menu);

  folderTitle.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    menu.style.top = ${event.clientY}px;
    menu.style.left = ${event.clientX}px;
    menu.style.display = "flex";
  });

  document.addEventListener("click", () => {
    menu.style.display = "none";
  });

  const [addSubfolderButton, deleteFolderButton] =
    menu.querySelectorAll(".contextOption");

  addSubfolderButton.addEventListener("click", () => {
    if (depth >= 2) {
      alert("Maximum nesting depth is 3.");
      return;
    }
    const name = prompt("Enter subfolder name:");
    if (name) {
      folder.children.push({
        id: generateRandomId(),
        title: 📁${name},
        type: "folder",
        children: [],
      });
      renderFolders(folderData, document.querySelector(".folders"));
      console.log("arr", folderData);
    }
  });

  deleteFolderButton.addEventListener("click", () => {
    const parent = folderData.find((f) => f.children.includes(folder));
    if (parent) parent.children = parent.children.filter((f) => f !== folder);
    else folderData = folderData.filter((f) => f !== folder);
    renderFolders(folderData, document.querySelector(".folders"));
  });
}

function setupAddFolderButton(button) {
  const modal = document.createElement("div");
  modal.style.cssText = 
    position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%);
    background-color: rgb(244, 223, 38); padding: 20px; border-radius: 10px; z-index: 10000; 
    display: none; width: 300px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  ;
  modal.innerHTML = 
    <p style="color: black; margin-bottom: 10px; text-align: center; font-weight: bold;">Enter folder name:</p>
    <input type="text" placeholder="New Folder" 
           style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #ccc; margin-bottom: 10px; font-size: 14px; color: black;">
    <button style="padding: 10px; width: 100%; background-color: rgb(255, 123, 7); color: black; border-radius: 5px; cursor: pointer;">Save</button>
    <button id="cancelButton" style="padding: 10px; width: 100%; background-color: rgb(255, 193, 7); color: black; border-radius: 5px; cursor: pointer; margin-top: 10px;">Cancel</button>
  ;

  document.body.appendChild(modal);

  const input = modal.querySelector("input");
  const saveButton = modal.querySelector("button");
  const cancelButton = modal.querySelector("#cancelButton");

  button.addEventListener("click", () => {
    modal.style.display = "block";
    input.focus(); // Focus the input field when the modal appears
  });

  saveButton.addEventListener("click", () => {
    const name = input.value.trim();
    if (name) {
      folderData.push({
        id: generateRandomId(),
        title: 📁${name},
        type: "folder",
        children: [],
      });
      renderFolders(folderData, document.querySelector(".folders"));
      modal.style.display = "none";
      console.log("arr", folderData);
    }
  });

  cancelButton.addEventListener("click", () => {
    modal.style.display = "none";
  });
}

const observer2 = new MutationObserver((mutations, observerInstance) => {
  const historyItems = document.querySelectorAll("li.relative"); // This is a NodeList
  console.log(historyItems);

  if (historyItems.length > 0) {
    // Check if items are found
    Array.from(historyItems).forEach((item) => {
      // Convert NodeList to an array and use forEach
      const addChat = document.createElement("p");
      addChat.innerText = "+";
      addChat.style.width = "30px";
      addChat.style.height = "30px";
      addChat.style.borderRadius = "50%";
      addChat.style.display = "none";
      addChat.style.placeItems = "center";
      addChat.style.fontSize = "20px";
      addChat.style.zIndex = "10000";
      addChat.style.position = "absolute";
      addChat.style.top = "0";
      addChat.style.right = "0";
      addChat.style.cursor = "pointer";

      item.firstChild.appendChild(addChat);
      observerInstance.disconnect(); // Stop observing once the element is found

      // Get the current page URL
      const URL = window.location.href;

      addChat.addEventListener("click", () => {
        const name = item.firstChild.firstChild.firstChild.innerText.replace(
          "+",
          ""
        );

        folderData.push({
          id: generateRandomId(),
          title: name,
          type: "file",
          children: [],
        });
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
        modalContainer.style.transition = "transform 6.3s ease"; // Add transition for smooth scaling
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
        modalBox.style.margin = "auto";
        modalBox.style.backgroundColor = "white";
        modalBox.style.borderRadius = "8px";
        modalBox.style.position = "absolute";
        modalBox.style.top = "50%";
        modalBox.style.left = "50%";
        modalBox.style.transform = "translate(-50%, -50%)";
        modalBox.style.backgroundColor = "black";
        modalContainer.appendChild(modalBox);

        modalContainerBackground.addEventListener("click", () => {
          if (document.getElementById("modalBoxId")) {
            modalBox.style.left = "10%";
            modalContainer.style.transform = "scale(0)"; // Trigger scale animation to 0
            setTimeout(() => {
              modalContainer.remove(); // Remove after animation completes
              console.log("Animation complete, modal removed");
            }, 6000); // Match timeout with animation duration
          }
        });

        if (document.getElementById("modalBoxId")) {
          renderNestedFolders(
            folderData,
            document.getElementById("modalBoxId")
          ); // Call to set up the UI

          const close = document.createElement("p");
          close.innerText = "Close";
          close.style.borderRadius = "10px";
          close.style.backgroundColor = "black";
          close.style.color = "white";
          (close.style.position = "absolute"), (close.style.top = "2%");
          close.style.right = "2%";
          close.style.cursor = "pointer";

          modalBox.appendChild(close);

          close.addEventListener("click", () => {
            if (document.getElementById("modalBoxId")) {
              modalContainer.style.transform = "scale(0)"; // Trigger scale animation to 0
              setTimeout(() => {
                modalContainer.remove(); // Remove after animation completes
                console.log("Animation complete, modal removed");
              }, 500); // Match timeout with animation duration
            }
          });

          observerInstance.disconnect(); // Disconnect observer after initialization
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
        addChat.style.display = "grid";
      });
      item.addEventListener("mouseleave", () => {
        addChat.style.display = "none";
      });
    });
  }
});

// Observe changes in the DOM
observer2.observe(document.body, { childList: true, subtree: true });

function renderNestedFolders(folderData, container) {
  container.innerHTML = ""; // Clear the container

  folderData.forEach((item) => {
    // Create the folder element
    const folderElement = document.createElement("div");
    folderElement.style.cssText = 
      display: flex; flex-direction: column; margin-left: 10px; margin-top: 5px;
    ;

    // Create the title
    const folderTitle = document.createElement("p");
    folderTitle.textContent = item.title;
    folderTitle.style.cssText = 
      background-color: #f4f4f4; padding: 5px; border-radius: 4px;
      cursor: pointer; font-size: 14px; color: #333; margin: 0;
    ;

    // Add toggle functionality for children
    let isExpanded = true;
    const childrenContainer = document.createElement("div");
    childrenContainer.style.cssText =
      "margin-left: 15px; display: flex; flex-direction: column;";
    folderTitle.addEventListener("click", () => {
      isExpanded = !isExpanded;
      childrenContainer.style.display = isExpanded ? "block" : "none";
    });

    folderElement.appendChild(folderTitle);
    folderElement.appendChild(childrenContainer);

    // Recursively render children if present
    if (item.children && item.children.length > 0) {
      renderNestedFolders(item.children, childrenContainer);
    }

    // Append to the main container
    container.appendChild(folderElement);
  });
}

console.log("arr", folderData);

function setupFolderUI(foldersContainer) {
  renderFolders(folderData, foldersContainer); // Display folder structure
}
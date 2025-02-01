let folderData = []; // Array to store folder structure
let checkBox = [];
let bookmarks = []; // Array to store bookmarked chats

function saveChat(chat) {
  chrome.runtime.sendMessage({ action: "saveChat", chat }, (response) => {
    if (response.error)
      console.error("Error saving chat to Supabase:", response.error);
    else console.log("Saved chat to Supabase:", response.data);
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

function deleteFolder(folderId) {
  chrome.runtime.sendMessage(
    { action: "deleteFolder", folderId: folderId },
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

function deleteChat(chatId) {
  chrome.runtime.sendMessage(
    { action: "deleteChat", chatId: chatId },
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

function deleteBookmark(bookmarkId) {
  chrome.runtime.sendMessage(
    { action: "deleteBookmarks", bookmarkId: bookmarkId },
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

// 🔹 Function to save a folder to Supabase
function saveFolder(folder) {
  chrome.runtime.sendMessage({ action: "saveFolder", folder }, (response) => {
    if (response.error)
      console.error("Error saving folder to Supabase:", response.error);
    else console.log("Saved folder to Supabase:", response.data);
  });
}

function fetchData(retryCount = 0, updateType, updatedItem) {
  chrome.runtime.sendMessage({ action: "getData" }, (response) => {
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
      // if (retryCount < 5) {
      //   // Retry max 5 times
      //   setTimeout(() => fetchData(retryCount + 1), 500);
      // }
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
      children: [],
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

    // 🔹 Sort folders by `id` to maintain order
    folderData.sort((a, b) => a.id - b.id);
    folderData.forEach((folder) => {
      folder.children.sort((a, b) => a.id - b.id); // ✅ Maintain order inside folders
    });

    // 🔹 Update UI only when all data is loaded
    if (folderData.length > 0 || bookmarks.length > 0 || chats.length > 0) {
      renderFolders(folderData, document.querySelector(".folders"));
      updateBookmarksDisplay(); // 🔹 Ensure this runs after bookmarks are set
    } else {
      console.warn("Data still empty, retrying...");
      // if (retryCount < 5) {
      //   setTimeout(() => fetchData(retryCount + 1), 500);
      //   console.log('1')

      // }
    }
  });
}

// 🔹 Call `fetchData` when the extension loads
fetchData();

// content.js
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "realtimeUpdate") {
    console.log("Realtime payload:", message.payload);

    // Force full refresh for all event types
    fetchData();

    // Specific handling for inserts
    if (message.payload.eventType === "INSERT") {
      const newFolder = message.payload.new;
      console.log("New folder detected:", newFolder);

      // Add directly to UI while waiting for full refresh
      const tempElement = createFolderElement({
        id: newFolder.id,
        title: newFolder.title,
        type: "folder",
        parent_id: newFolder.parent_id,
        children: [],
      });

      document.querySelector(".folders").prepend(tempElement);
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
  container.style.cssText = `
    padding: 15px;
    margin: 10px 0;
    background-color: black;
    border-radius: 8px;
    color: #ffffff;
    font-weight: normal;
    border: 1px solid black;
  `;

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <div>
        <p>Bookmarks</p>
        <div class="bookmarks-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
      </div>
      <div style="position: relative;">
        <p>Folders</p>
        <button 
          id="addFolder"
          style="padding: 5px; font-size: 14px; background-color: black; width: 100%; color: white;  border: 1px solid #444; border-radius: 5px;"
        >
          📁 New Folder
        </button>
        <input 
          type="text" 
          id="folderSearch"
          placeholder="Search folders and chats..."
          style="margin-top: 10px; padding: 5px; font-size: 14px; background-color: black; width: 100%; color: white; border: 1px solid #444; border-radius: 5px;"
        >
        <div class="folders" style="display: flex; flex-direction: column; margin-top: 10px;"></div>
      </div>
    </div>
  `;

  targetElement.insertAdjacentElement("afterend", container);

  setupFolderUI(container.querySelector(".folders")); // Initialize folder system
  setupAddFolderButton(container.querySelector("#addFolder")); // Handle "Add Folder" button
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
  const folderName = prompt("Enter Folder Name:");
  if (!folderName) return;

  const newFolder = {
    id: Math.floor(Math.random() * 1000000),
    title: folderName,
    parent_id: parentId, // Assign parent folder ID if provided
    type: "folder",
    children: [],
  };

  // 🔹 Save new folder to Supabase
  chrome.runtime.sendMessage(
    { action: "saveFolder", folder: newFolder },
    (response) => {
      if (response.error) {
        console.error("Error saving folder to Supabase:", response.error);
      } else {
        console.log("Folder successfully saved:", response.data);
        fetchData(); // Reload data after creating folder
      }
    }
  );
}

function createFolderElement(folder, index, depth) {
  const folderElement = document.createElement("div");
  folderElement.style.marginLeft = "5px";
  folderElement.style.flexDirection = "column";
  const backgroundColor = colorGenerator(folder.title);

  const folderTitle = document.createElement("p");
  folderTitle.textContent = folder.title;
  folderTitle.style.cssText = `
  background-color: ${folder.type === "folder" ? backgroundColor : "black"};
  padding: 5px; border-radius: 5px; color: ${
    folder.type === "folder"
      ? isColorDark(backgroundColor)
        ? "white"
        : "black"
      : "white"
  }; cursor: pointer;
  margin-top: 10px; font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  `;

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

        if (draggedItem.type === "file" || draggedItem.type === "folder") {
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
            },
            (response) => {
              if (response.error) {
                console.error("Error updating chat folder:", response.error);
              } else {
                console.log("Chat folder updated in Supabase:", response.data);
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
            },
            (response) => {
              if (response.error) {
                console.error("Error updating folder parent:", response.error);
              } else {
                console.log(
                  "Folder parent updated in Supabase:",
                  response.data
                );
              }
            }
          );

          // Add to new location
          folder.children.unshift({
            id: draggedItemData.id,
            title: draggedItemData.title,
            type: draggedItemData.type,
            children: draggedItemData.children || [], // Preserve children if it's a folder
          });

          // Save and re-render
          chrome.storage.local.set({ folderData: folderData });
          renderFolders(folderData, document.querySelector(".folders"));
        }
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
          // Remove from old location
          removeItemFromFolder(folderData, draggedItem.id);

          console.log("me", draggedItem, folder?.id);

          const newChat = {
            title: draggedItem?.title,
            type: "file",
            children: null,
            link: draggedItem?.link,
          };

          const exists = folderData.some((f) => f.id === draggedItem?.id);
          console.log("Exists in folderData?", exists);

          if (!exists) {
            console.log("dragFold");
            // 🔹 Step 2: save chat To folder in Supabase
            chrome.runtime.sendMessage(
              { action: "saveChat", chat: newChat },

              (response) => {
                if (response.error) {
                  console.error(
                    "Error saving chat to Supabase:",
                    response.error
                  );
                } else {
                  console.log("Chat successfully saved:", response.data);

                  // 🔹 Now, get the actual chat ID from Supabase
                  const chatId = response?.data[0]?.id; // Supabase returns an array

                  if (!chatId) {
                    console.error("Chat ID not received from Supabase");
                    return;
                  }

                  chrome.runtime.sendMessage(
                    {
                      action: "saveChatToFolder",
                      chatId: chatId, // Use actual chat ID from Supabase
                      folderId: folder?.id,
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
                }
              }
            );
          }

          if (folderData.find((f) => f.id === draggedItem?.id)) {
            console.log("aded");
            chrome.runtime.sendMessage(
              {
                action: "updateChatFolder",
                chatId: draggedItem?.id,
                folderId: folder?.id,
              },
              (response) => {
                if (response.error) {
                  console.error("Error updating chat folder:", response.error);
                } else {
                  console.log(
                    "Chat folder updated in Supabase:",
                    response.data
                  );

                  fetchData(); // Refresh UI after update
                }
              }
            );
          }

          console.log("dragged", folderData);

          // Add to new location
          folder.children.unshift({
            id: draggedItem.id,
            title: draggedItem.title,
            type: "file",
            children: [],
          });

          // Save and re-render
          chrome.storage.local.set({ folderData: folderData });
          renderFolders(folderData, document.querySelector(".folders"));
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
    folderTitle.textContent = isExpanded
      ? folder.title.replace("📁", "📂")
      : folder.title.replace("📂", "📁");
  });

  addContextMenu(folder, folderTitle, subfolderContainer, depth);

  return folderElement;
}

function addContextMenu(folder, folderTitle, subfolderContainer, depth) {
  const menu = document.createElement("div");
  menu.style.cssText = `
    position: absolute; background-color: #2a2a2a; color: white; border-radius: 8px;
    display: none; flex-direction: column; gap: 8px; padding: 10px; z-index: 10000;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    border: 1px solid #444;
    font-family: Arial, sans-serif;
  `;

  menu.innerHTML = `
    <button class="contextOption" style="padding: 8px; background-color: #3a3a3a; border: none; border-radius: 4px; cursor: pointer;">➕ Add Folder</button>
    <button class="contextOption" style="padding: 8px; background-color: #3a3a3a; border: none; border-radius: 4px; cursor: pointer;">✏️ Rename</button>
    <button class="contextOption" style="padding: 8px; background-color: #3a3a3a; border: none; border-radius: 4px; cursor: pointer; color: #ff4d4d;">🗑️ Delete</button>
  `;

  // Remove the "Add Folder" button if the item is a file
  if (folder.type === "file") {
    menu.querySelector("button").style.display = "none"; // Hide "Add Folder"
  }

  document.body.appendChild(menu);

  folderTitle.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${event.clientX}px`;
    menu.style.display = "flex";
  });

  document.addEventListener("click", () => {
    menu.style.display = "none";
  });

  const [addSubfolderButton, renameButton, deleteFolderButton] =
    menu.querySelectorAll(".contextOption");

  // Add Subfolder
  addSubfolderButton.addEventListener("click", () => {
    if (depth >= 20) {
      alert("Maximum nesting depth is 3.");
      return;
    }
    const name = prompt("Enter subfolder name:");
    if (name) {
      const newFolder = {
        title: `📁${name}`,
        type: "folder",
        children: null,
        parent_id: parseInt(sessionStorage.getItem("folderId")),
      };

      // Save to Supabase
      saveFolder(newFolder);

      folder.children.push({
        id: generateRandomId(),
        title: `📁${name}`,
        type: "folder",
        children: [],
      });
      renderFolders(folderData, document.querySelector(".folders"));
      console.log("arr", folderData);
    }
  });

  // Rename Folder/File
  renameButton.addEventListener("click", () => {
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

  // Delete Folder/File
  deleteFolderButton.addEventListener("click", () => {
    const parent = folderData.find((f) => f.children.includes(folder));
    if (parent) parent.children = parent.children.filter((f) => f !== folder);
    else folderData = folderData.filter((f) => f !== folder);

    if (folder.type === "folder") {
      // ✅ Handle folder deletion
      if (
        confirm(
          `Are you sure you want to delete "${folder.title}"? This will delete all subfolders and chats inside it.`
        )
      ) {
        deleteFolder(folder.id);
      }
    } else {
      // ✅ Handle folder deletion
      if (confirm(`Are you sure you want to delete "${folder.title}"?`)) {
        deleteChat(folder.id);
      }
    }

    renderFolders(folderData, document.querySelector(".folders"));
    // Save to storage after deleting folder
    chrome.storage.local.set({ folderData: folderData });
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
    const name = input.value.trim();
    if (name) {
      const newFolder = { title: `📁${name}`, type: "folder", children: null };

      // Save to Supabase
      saveFolder(newFolder);

      folderData.push({
        id: generateRandomId(),
        title: `📁${name}`,
        type: "folder",
        children: [],
      });
      renderFolders(folderData, document.querySelector(".folders"));
      input.value = "";
      modal.style.display = "none";
      // Save to storage after adding folder
      chrome.storage.local.set({ folderData: folderData });
      console.log("arr", folderData);
    }
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
              const isCurrentlyBookmarked = bookmarks.some(
                (b) => b.link === chatLink
              );

              if (isCurrentlyBookmarked) {
                // Remove bookmark
                bookmarks = bookmarks.filter((b) => b.link !== chatLink);
                bookmarkBtn.innerText = "☆ Bookmark";
              } else {
                const newBookmark = {
                  title: chatTitle,
                  link: chatLink,
                };
                // Add bookmark
                saveBookmark(newBookmark);

                bookmarks.push({
                  id: generateRandomId(),
                  title: chatTitle,
                  link: chatLink,
                  timestamp: new Date().toISOString(),
                });
                bookmarkBtn.innerText = "🌟 Bookmarked";
              }

              // Save updated bookmarks
              chrome.storage.local.set({ bookmarks: bookmarks });
              console.log("Updated bookmarks:", bookmarks);

              // Update bookmarks display in UI
              updateBookmarksDisplay();
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
                            console.error("Chat ID not received from Supabase");
                            return;
                          }

                          // 🔹 Now link the chat to the selected folders
                          selectedFolders.forEach((folder) => {
                            chrome.runtime.sendMessage(
                              {
                                action: "saveChatToFolder",
                                chatId: chatId, // Use actual chat ID from Supabase
                                folderId: folder.id,
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
                            folder.children.unshift({
                              id: chatId,
                              title: newChat.title,
                              type: "file",
                              children: [],
                              link: newChat.link,
                            });
                          });

                          // Reset checkboxes
                          checkBox = [];

                          // Update UI
                          renderFolders(
                            folderData,
                            document.querySelector(".folders")
                          );
                          chrome.storage.local.set({ folderData: folderData });

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
  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.trim();
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
      padding: 8px;
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
      e.preventDefault();
      e.stopPropagation();
      deleteBookmark(bookmark?.id);
      bookmarks = bookmarks.filter((b) => b.id !== bookmark.id);
      chrome.storage.local.set({ bookmarks: bookmarks });
      updateBookmarksDisplay();
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

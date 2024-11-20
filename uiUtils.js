import { folderData, colorGenerator, isColorDark, saveFolderData, generateRandomId } from './folderUtils.js';

function renderFolders(folderArray, container, depth = 0) {
  container.innerHTML = "";
  folderArray.forEach((folder, index) => {
    const folderElement = createFolderElement(folder, index, depth);
    container.appendChild(folderElement);
  });
}

function createFolderElement(folder, index, depth) {
  const folderElement = document.createElement("div");
  folderElement.className = "folder-container";
  folderElement.style.marginLeft = depth * 16 + "px";

  const folderTitle = createFolderTitle(folder);
  folderElement.appendChild(folderTitle);

  const subfolderContainer = createSubfolderContainer(folder, depth);
  folderElement.appendChild(subfolderContainer);

  setupFolderInteractions(folder, folderTitle, subfolderContainer);
  addContextMenu(folder, folderTitle, subfolderContainer, depth);

  return folderElement;
}

function createFolderTitle(folder) {
  const folderTitle = document.createElement("div");
  folderTitle.className = "folder-title";
  folderTitle.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 16px;">${folder.type === 'folder' ? '📁' : '📄'}</span>
      <span>${folder.title.replace('📁', '').replace('📂', '')}</span>
    </div>
  `;
  
  const backgroundColor = folder.type === 'folder' ? colorGenerator(folder.title) : '#2d2d2d';
  folderTitle.style.cssText = `
    background-color: ${backgroundColor};
    padding: 8px 12px;
    border-radius: 8px;
    color: ${isColorDark(backgroundColor) ? 'white' : 'black'};
    cursor: pointer;
    margin: 4px 0;
    font-size: 14px;
    transition: all 0.2s ease;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;

  return folderTitle;
}

function createSubfolderContainer(folder, depth) {
  const container = document.createElement("div");
  container.style.cssText = `
    margin-left: 10px; 
    display: flex; 
    flex-direction: column;
  `;
  renderFolders(folder.children, container, depth + 1);
  return container;
}

function setupFolderInteractions(folder, folderTitle, subfolderContainer) {
  let isExpanded = true;

  folderTitle.addEventListener("mouseover", () => {
    folderTitle.style.backgroundColor = "rgb(100, 100, 100)";
  });

  folderTitle.addEventListener("mouseleave", () => {
    folderTitle.style.backgroundColor = folder.type === "folder" ? 
      colorGenerator(folder.title) : "black";
  });

  folderTitle.addEventListener("click", () => {
    isExpanded = !isExpanded;
    subfolderContainer.style.display = isExpanded ? "flex" : "none";
    folderTitle.textContent = isExpanded
      ? folder.title.replace("📁", "📂")
      : folder.title.replace("📂", "📁");
  });
}

export {
  renderFolders,
  createFolderElement
};

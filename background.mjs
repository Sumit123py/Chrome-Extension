import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://iiokcprfxttdlszwhpma.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpb2tjcHJmeHR0ZGxzendocG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQ4MTgxMTQsImV4cCI6MjAzMDM5NDExNH0.suVgkMsAdXHDDPmhrvXjCop-pbY70b1LzIt_6dS8ddI";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const setupRealtime = () => {
  const tables = ['folders', 'chats', 'chats_folder', 'bookmarks'];
  
  tables.forEach(table => {
    supabase
      .channel(table)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: table
      }, (payload) => {
        console.log(`Realtime ${table} update:`, payload);
        chrome.runtime.sendMessage({
          action: "realtimeUpdate",
          payload: payload
        });
      })
      .subscribe();
  });
};

setupRealtime();

// Function to save bookmarks in Supabase
async function saveBookmarkToSupabase(bookmark) {
  const { data, error } = await supabase
    .from("bookmarks") // Supabase table name
    .insert([{ title: bookmark?.title, link: bookmark?.link }]);

  if (error) {
    console.error("Supabase Error:", error);
    return { error };
  } else {
    console.log("Saved to Supabase:", data);
    return { data };
  }
}

// 🔹 Function to fetch bookmarks from Supabase
async function getBookmarksFromSupabase() {
  const { data, error } = await supabase.from("bookmarks").select("*");

  if (error) {
    console.error("Supabase Error (Get Bookmarks):", error);
    return { error };
  } else {
    console.log("Fetched bookmarks:", data);
    return { data };
  }
}

// 🔹 Function to save a chat to Supabase
async function saveChatToSupabase(chat) {
  const { data, error } = await supabase
    .from("chats")
    .insert([{ title: chat?.title, link: chat?.link }])
    .select("*"); // 🔹 Ensure Supabase returns the inserted row
  if (error) {
    console.error("Supabase Error (Insert Chat):", error);
    return { error };
  } else {
    console.log("Chat saved to Supabase:", data);
    return { data };
  }
}

// 🔹 Function to insert a folder into Supabase
async function saveFolderToSupabase(folder) {
  const { data, error } = await supabase
    .from("folders")
    .insert([
      {
        title: folder?.title,
        parent_id: folder?.parent_id,
      },
    ])
    .select("id, title, parent_id"); // ✅ Fetch the inserted folder's data

  if (error) {
    console.error("Supabase Error (Insert Folder):", error);
    return { error };
  } else {
    console.log("Folder saved to Supabase:", data);
    return { data };
  }
}

// 🔹 Function to fetch folders from Supabase
async function getFoldersFromSupabase() {
  const { data, error } = await supabase.from("folders").select("*");

  if (error) {
    console.error("Supabase Error (Get Folders):", error);
    return { error };
  } else {
    console.log("Fetched folders:", data);
    return { data };
  }
}

// 🔹 Function to save chat inside a folder
async function saveChatToFolder(chatId, folderId) {
  const { data, error } = await supabase
    .from("chats_folder")
    .insert([{ chat_id: chatId, folder_id: folderId }]);

  if (error) {
    console.error("Supabase Error (Save Chat to Folder):", error);
    return { error };
  } else {
    console.log("Chat linked to folder:", data);
    return { data };
  }
}

// 🔹 Function to fetch chats inside folders
async function getChatsInFolders() {
  const { data, error } = await supabase
    .from("chats_folder")
    .select("chat_id, folder_id, chats(title, link)");

  if (error) {
    console.error("Supabase Error (Get Chats in Folders):", error);
    return { error };
  } else {
    console.log("Fetched chats in folders:", data);
    return { data };
  }
}

// 🔹 Function to fetch chats from Supabase
async function getChatsFromSupabase() {
  const { data, error } = await supabase.from("chats").select("*");

  if (error) {
    console.error("Supabase Error (Get Chats):", error);
    return { error };
  } else {
    console.log("Fetched chats:", data);
    return { data };
  }
}

async function updateFolderParent(folderId, parentId) {
  const { data, error } = await supabase
    .from("folders")
    .update({ parent_id: parentId })
    .eq("id", folderId);

  if (error) {
    console.error("Supabase Error (Update Folder Parent):", error);
    return { error };
  } else {
    console.log("Updated folder parent in Supabase:", data);
    return { data };
  }
}

async function updateChatFolder(chatId, newFolderId) {
  // 🔹 Delete old folder association
  await supabase.from("chats_folder").delete().eq("chat_id", chatId);

  // 🔹 Insert new folder association
  const { data, error } = await supabase
    .from("chats_folder")
    .insert([{ chat_id: chatId, folder_id: newFolderId }]);

  if (error) {
    console.error("Supabase Error (Update Chat Folder):", error);
    return { error };
  } else {
    console.log("Updated chat folder in Supabase:", data);
    return { data };
  }
}

async function renameItem(itemId, newTitle, itemType) {
  const table = itemType === "folder" ? "folders" : "chats";

  const { data, error } = await supabase
    .from(table)
    .update({ title: itemType === "folder" ? `📁${newTitle}` : `${newTitle}` })
    .eq("id", itemId);

  if (error) {
    console.error("Supabase Error (Rename Item):", error);
    return { error };
  } else {
    console.log("Renamed item in Supabase:", data);
    return { data };
  }
}

async function deleteFolderFromSupabase(folderId) {
  console.log(`Deleting folder ${folderId} and its contents...`);

  // 🔹 Delete all chats inside this folder
  await supabase.from("chats_folder").delete().eq("folder_id", folderId);

  // 🔹 Delete all subfolders
  const { data: subfolders, error: subfolderError } = await supabase
    .from("folders")
    .select("id")
    .eq("parent_id", folderId);

  if (subfolderError) {
    console.error("Supabase Error (Fetch Subfolders):", subfolderError);
    return { error: subfolderError };
  }

  for (const subfolder of subfolders) {
    await deleteFolderFromSupabase(subfolder.id); // 🔹 Recursively delete subfolders
  }

  // 🔹 Finally, delete the main folder
  const { error: folderError } = await supabase
    .from("folders")
    .delete()
    .eq("id", folderId);

  if (folderError) {
    console.error("Supabase Error (Delete Folder):", folderError);
    return { error: folderError };
  }

  console.log(`Folder ${folderId} and its contents deleted.`);
  return { success: true };
}

async function deleteChatFromSupabase(chatId) {
  console.log(`Deleting chat ${chatId}...`);

  // 🔹 Step 1: Delete the chat from `chats_folder` first
  await supabase.from("chats_folder").delete().eq("chat_id", chatId);

  // 🔹 Step 2: Then delete the chat from `chats`
  const { error } = await supabase.from("chats").delete().eq("id", chatId);

  if (error) {
    console.error("Supabase Error (Delete Chat):", error);
    return { error };
  }

  console.log(`Chat ${chatId} deleted.`);
  return { success: true };
}

async function deleteBookmarkFromSupabase(bookmarkId) {
  console.log(`Deleting bookmark ${bookmarkId}...`);

  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("id", bookmarkId);

  if (error) {
    console.error("Supabase Error (Delete Bookmark):", error);
    return { error };
  }

  console.log(`Bookmark ${bookmarkId} deleted.`);
  return { success: true };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveBookmark") {
    saveBookmarkToSupabase(message.bookmark)
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true; // Keeps the response open for async calls
  }

  if (message.action === "saveChatToFolder") {
    saveChatToFolder(message.chatId, message.folderId)
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === "realtimeUpdate") {
    // Handle real-time updates here
    console.log("Real-time update received:", message.payload);
    // You can trigger a re-fetch of data or update the UI accordingly
  }

  if (message.action === "deleteFolder") {
    deleteFolderFromSupabase(message.folderId)
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === "deleteBookmarks") {
    deleteBookmarkFromSupabase(message.bookmarkId)
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === "deleteChat") {
    deleteChatFromSupabase(message.chatId)
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === "renameFoldersAndChats") {
    renameItem(message.itemId, message.newTitle, message.itemType)
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === "updateFolderParent") {
    updateFolderParent(message.folderId, message.parentId)
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === "saveChat") {
    saveChatToSupabase(message.chat)
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === "updateChatFolder") {
    updateChatFolder(message.chatId, message.folderId)
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === "saveFolder") {
    saveFolderToSupabase(message.folder)
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === "getData") {
    Promise.all([
      getFoldersFromSupabase(),
      getBookmarksFromSupabase(),
      getChatsFromSupabase(),
      getChatsInFolders(),
    ])
      .then(
        ([
          foldersResponse,
          bookmarksResponse,
          chatsResponse,
          chatFoldersResponse,
        ]) => {
          sendResponse({
            folders: foldersResponse.data || [],
            bookmarks: bookmarksResponse.data || [],
            chats: chatsResponse.data || [],
            chatFolders: chatFoldersResponse.data || [],
          });
        }
      )
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed! Testing Supabase...");
});

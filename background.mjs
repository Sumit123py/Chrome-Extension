import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://iiokcprfxttdlszwhpma.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpb2tjcHJmeHR0ZGxzendocG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQ4MTgxMTQsImV4cCI6MjAzMDM5NDExNH0.suVgkMsAdXHDDPmhrvXjCop-pbY70b1LzIt_6dS8ddI";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// // 🔹 Function to test database connection
// async function testSupabaseConnection() {
//   const { data, error } = await supabase
//     .from("Food") // Replace with an actual table name
//     .select("*")
//     .limit(1); // Fetch one record to check if it works

//   if (error) {
//     console.error("Supabase error:", error);
//   } else {
//     console.log("Supabase data:", data);
//   }
// }

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

  if (message.action === "saveChat") {
    saveChatToSupabase(message.chat)
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

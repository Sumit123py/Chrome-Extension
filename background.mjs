import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hpkbboqsakdygxojgcsb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwa2Jib3FzYWtkeWd4b2pnY3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0NjQ2NTUsImV4cCI6MjA1NDA0MDY1NX0.3O276DS3wL8Wc9Gh8Vvh7YX_n0KN_-Ib9gZMQsmMp5c";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function queryDeepSeek(prompt) {
  const API_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwYXNwb2xhc3VtaXQyMDA0QGdtYWlsLmNvbSIsImlhdCI6MTczODU4MTk2NX0.pwfNy5jb35jmwsMicFOF-ZBxGqfeeTEAuTYrEl-UdNU"; // 🔹 Replace with your actual API Key
  const response = await fetch(
    "https://api.hyperbolic.xyz/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-V3", // Adjust model name if needed
        messages: [{ role: "user", content: prompt }],
      }),
    }
  );

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "Error fetching response";
}

// Store for active reminders
let activeReminders = new Map();

// Function to set a reminder
async function setReminderInSupabase(reminder) {
  const { data, error } = await supabase
    .from("reminders")
    .insert([
      {
        note_id: reminder.noteId,
        reminder_time: new Date(reminder.reminderTime).toISOString(),
        note_content: reminder.noteContent,
        status: "pending",
        link: reminder.link,
      },
    ])
    .select("*");

  if (error) {
    console.error("Supabase Error (Set Reminder):", error);
    return { error };
  }

  // Schedule the reminder
  scheduleReminder(data[0]);
  return { data: data[0] };
}

// Function to schedule a reminder
function scheduleReminder(reminder) {
  const timeUntilReminder =
    new Date(reminder.reminder_time).getTime() - Date.now();

  if (timeUntilReminder <= 0) {
    console.warn("Skipping past reminder:", reminder);
    return;
  }

  // Create unique alarm name
  const alarmName = `reminder-${reminder.id}`;

  // Create alarm
  chrome.alarms.create(alarmName, {
    when: Date.now() + timeUntilReminder,
  });

  console.log(
    `Alarm scheduled: ${alarmName} for ${new Date(
      Date.now() + timeUntilReminder
    ).toLocaleString()}`
  );

  // Store reminder data
  activeReminders.set(reminder.id, reminder);
}

// Handle notification click
chrome.notifications.onButtonClicked.addListener(
  (notificationId, buttonIndex) => {
    if (notificationId.startsWith("reminder-")) {
      const reminderId = parseInt(notificationId.split("-")[1]);

      // Find the note associated with this reminder
      supabase
        .from("reminders")
        .select("*")
        .eq("id", reminderId)
        .single()
        .then(({ data, error }) => {
          console.log("da", data);
          if (!error && data) {
            // Open the chat with the note
            chrome.tabs.create({
              url: `${data.link}`,
            });
          }
        });
    }
  }
);

// Function to show Chrome notification
function showNotification(reminder) {
  chrome.notifications.create(`reminder-${reminder.id}`, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("./image/folders.png"), // Make sure this icon exists in your extension
    title: "Note Reminder",
    message: reminder.note_content,
    priority: 2,
    requireInteraction: true, // Notification will remain until user interacts
    buttons: [{ title: "View Note" }],
  });

  // Update reminder status in Supabase
  supabase
    .from("reminders")
    .update({ status: "completed" })
    .eq("id", reminder.id)
    .then(({ error }) => {
      if (error) console.error("Error updating reminder status:", error);
    });
}

// Handle alarm trigger
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith("reminder-")) {
    const reminderId = parseInt(alarm.name.split("-")[1]);
    const reminder = activeReminders.get(reminderId);

    if (reminder) {
      showNotification(reminder);
      activeReminders.delete(reminderId);
    } else {
      // Fallback: fetch reminder from Supabase if not in memory
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("id", reminderId)
        .single();

      if (!error && data) {
        showNotification(data);
      }
    }
  }
});

// Load active reminders when extension starts
async function loadActiveReminders() {
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("status", "pending")
    .gt("reminder_time", new Date().toISOString());

  if (error) {
    console.error("Error loading reminders:", error);
    return;
  }

  console.log(`Loading ${data.length} active reminders`);
  data.forEach(scheduleReminder);
}

// 🔹 Sign Up Function (Username & Password)
async function signUpWithUsername(username, password) {
  // Check if username already exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .single();

  if (existingUser) {
    return { error: "Username already exists." };
  }

  // Insert new user
  const { data, error } = await supabase
    .from("users")
    .insert([{ username, password }])
    .select("id, username");

  if (error) {
    console.error("Signup error:", error);
    return { error };
  }

  console.log("User signed up successfully:", data);
  chrome.storage.local.set({ user: data[0] });

  return { data: data[0] };
}

// 🔹 Sign In Function (Username & Password)
async function signInWithUsername(username, password) {
  const { data, error } = await supabase
    .from("users")
    .select("id, username")
    .eq("username", username)
    .eq("password", password)
    .single();

  if (error || !data) {
    console.error("Login error:", error);
    return { error: "Invalid username or password." };
  }

  console.log("User logged in successfully:", data);
  chrome.storage.local.set({ user: data });

  return { data };
}

// 🔹 Log Out Function
async function signOut() {
  chrome.storage.local.remove("user");
  console.log("User logged out");
}

// 🔹 Check If User is Logged In on Extension Startup
function checkUserSession() {
  chrome.storage.local.get(["user"], (result) => {
    if (result.user) {
      console.log("User session restored:", result.user);
    } else {
      console.log("No active session found.");
    }
  });
}

// Run this on extension startup
checkUserSession();

// Send real-time update only if a content script is active
function sendMessageToContentScript(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
        if (chrome.runtime.lastError) {
          console.warn("No content script found. Ignoring message.");
        } else {
          console.log("Message sent to content script:", message);
        }
      });
    }
  });
}

// 🔹 Listen for real-time changes in folders, chats, bookmarks, and chats_folder
function setupRealtimeListeners() {
  const tables = [
    "folders",
    "chats",
    "bookmarks",
    "chats_folder",
    "notes",
    "reminders",
  ];

  tables.forEach((table) => {
    supabase
      .channel(table)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: table },
        (payload) => {
          console.log(`🔄 Real-time update received for ${table}:`, payload);

          let updateType = payload.eventType || payload.event;
          let updatedItem = payload.new || payload.old;

          // Send real-time update to content.js
          sendMessageToContentScript({
            action: "realtimeUpdate",
            table: table,
            updateType: updateType,
            updatedItem: updatedItem,
          });
        }
      )
      .subscribe();
  });
}

// 🔹 Call function to start listening
setupRealtimeListeners();

// Function to save bookmarks in Supabase
async function saveBookmarkToSupabase(bookmark) {
  if (!bookmark.user_id) {
    console.error("Error: User ID is missing when saving the bookmark!");
    return { error: "User ID is required" };
  }

  const { data, error } = await supabase
    .from("bookmarks") // Supabase table name
    .insert([
      {
        title: bookmark?.title,
        link: bookmark?.link,
        user_id: bookmark.user_id,
      },
    ])
    .select("*");

  if (error) {
    console.error("Supabase Error:", error);
    return { error };
  } else {
    console.log("Saved to Supabase:", data);
    return { data };
  }
}

// 🔹 Function to fetch bookmarks from Supabase
async function getBookmarksFromSupabase(user_id) {
  const { data, error } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", user_id);

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
  if (!chat.user_id) {
    console.error("Error: User ID is missing when saving the chat!");
    return { error: "User ID is required" };
  }

  const { data, error } = await supabase
    .from("chats")
    .insert([{ title: chat?.title, link: chat?.link, user_id: chat?.user_id }])
    .select("*"); // 🔹 Ensure Supabase returns the inserted row

  if (error) {
    console.error("Supabase Error (Insert Chat):", error);
    return { error };
  } else {
    console.log("Chat saved to Supabase:", data);
    return { data };
  }
}

async function saveFolderToSupabase(folder) {
  if (!folder.user_id) {
    console.error("Error: User ID is missing when saving the folder!");
    return { error: "User ID is required" };
  }

  const { data, error } = await supabase
    .from("folders")
    .insert([
      {
        title: folder?.title,
        parent_id: folder?.parent_id,
        user_id: folder?.user_id, // ✅ Ensure user_id is correctly inserted
      },
    ])
    .select("id, title, parent_id, user_id"); // ✅ Fetch user_id as well

  if (error) {
    console.error("Supabase Error (Insert Folder):", error);
    return { error };
  } else {
    console.log("Folder saved to Supabase:", data);
    return { data };
  }
}

// 🔹 Function to save chat inside a folder
async function saveChatToFolder(chatId, folderId, user_id) {
  if (!user_id) {
    console.error("Error: User ID is missing when saving the chat folder!");
    return { error: "User ID is required" };
  }

  const { data, error } = await supabase
    .from("chats_folder")
    .insert([{ chat_id: chatId, folder_id: folderId, user_id: user_id }])
    .select("*");

  if (error) {
    console.error("Supabase Error (Save Chat to Folder):", error);
    return { error };
  } else {
    console.log("Chat linked to folder:", data);
    return { data };
  }
}

// 🔹 Function to fetch folders from Supabase
async function getFoldersFromSupabase(user_id) {
  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", user_id);

  if (error) {
    console.error("Supabase Error (Get Folders):", error);
    return { error };
  } else {
    console.log("Fetched folders:", data);
    return { data };
  }
}

// 🔹 Function to fetch chats inside folders
async function getChatsInFolders(user_id) {
  const { data, error } = await supabase
    .from("chats_folder")
    .select("chat_id, folder_id, chats(title, link)")
    .eq("user_id", user_id);

  if (error) {
    console.error("Supabase Error (Get Chats in Folders):", error);
    return { error };
  } else {
    console.log("Fetched chats in folders:", data);
    return { data };
  }
}

// 🔹 Function to fetch chats from Supabase
async function getChatsFromSupabase(user_id) {
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", user_id);

  if (error) {
    console.error("Supabase Error (Get Chats):", error);
    return { error };
  } else {
    console.log("Fetched chats:", data);
    return { data };
  }
}

async function updateFolderParent(folderId, parentId, user_id) {
  const { data, error } = await supabase
    .from("folders")
    .update({ parent_id: parentId })
    .eq("id", folderId)
    .eq("user_id", user_id);

  if (error) {
    console.error("Supabase Error (Update Folder Parent):", error);
    return { error };
  } else {
    console.log("Updated folder parent in Supabase:", data);
    return { data };
  }
}

async function updateChatFolder(chatId, newFolderId, user_id) {
  if (!user_id) {
    console.error("Error: User ID is missing when saving the chat folder!");
    return { error: "User ID is required" };
  }

  // 🔹 Delete old folder association
  await supabase
    .from("chats_folder")
    .delete()
    .eq("chat_id", chatId)
    .eq("user_id", user_id);

  // 🔹 Insert new folder association
  const { data, error } = await supabase
    .from("chats_folder")
    .insert([{ chat_id: chatId, folder_id: newFolderId, user_id: user_id }])
    .select("*");

  if (error) {
    console.error("Supabase Error (Update Chat Folder):", error);
    return { error };
  } else {
    console.log("Updated chat folder in Supabase:", data);
    return { data };
  }
}

async function renameItem(itemId, newTitle, itemType, user_id) {
  const table = itemType === "folder" ? "folders" : "chats";

  const { data, error } = await supabase
    .from(table)
    .update({ title: itemType === "folder" ? `📁${newTitle}` : `${newTitle}` })
    .eq("id", itemId)
    .eq("user_id", user_id);

  if (error) {
    console.error("Supabase Error (Rename Item):", error);
    return { error };
  } else {
    console.log("Renamed item in Supabase:", data);
    return { data };
  }
}

async function deleteFolderFromSupabase(folderId, user_id) {
  console.log(`Deleting folder ${folderId} and its contents...`);

  // 🔹 Delete all chats inside this folder
  await supabase
    .from("chats_folder")
    .delete()
    .eq("folder_id", folderId)
    .eq("user_id", user_id);

  // 🔹 Delete all subfolders
  const { data: subfolders, error: subfolderError } = await supabase
    .from("folders")
    .select("id")
    .eq("parent_id", folderId)
    .eq("user_id", user_id);

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
    .eq("id", folderId)
    .eq("user_id", user_id);

  if (folderError) {
    console.error("Supabase Error (Delete Folder):", folderError);
    return { error: folderError };
  }

  console.log(`Folder ${folderId} and its contents deleted.`);
  return { success: true };
}

async function deleteChatFromSupabase(chatId, user_id) {
  console.log(`Deleting chat ${chatId}...`);

  // 🔹 Step 1: Delete the chat from `chats_folder` first
  await supabase
    .from("chats_folder")
    .delete()
    .eq("chat_id", chatId)
    .eq("user_id", user_id);

  // 🔹 Step 2: Then delete the chat from `chats`
  const { error } = await supabase
    .from("chats")
    .delete()
    .eq("id", chatId)
    .eq("user_id", user_id);

  if (error) {
    console.error("Supabase Error (Delete Chat):", error);
    return { error };
  }

  console.log(`Chat ${chatId} deleted.`);
  return { success: true };
}

async function deleteBookmarkFromSupabase(bookmarkId, user_id) {
  console.log(`Deleting bookmark ${bookmarkId}...`);

  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("id", bookmarkId)
    .eq("user_id", user_id);

  if (error) {
    console.error("Supabase Error (Delete Bookmark):", error);
    return { error };
  }

  console.log(`Bookmark ${bookmarkId} deleted.`);
  return { success: true };
}

async function saveNoteToSupabase(note) {
  if (!note.user_id) {
    console.error("Error: User ID is missing when saving the note!");
    return { error: "User ID is required" };
  }

  const { data, error } = await supabase
    .from("notes")
    .insert([
      {
        chat_id: note.chat_id,
        content: note.content,
        user_id: note.user_id,
        link: note.link,
      },
    ])
    .select("*");

  if (error) {
    console.error("Supabase Error (Save Note):", error);
    return { error };
  }

  return { data: data[0] };
}

async function getNotesFromSupabase(chatId, userId) {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("chat_id", chatId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase Error (Get Notes):", error);
    return { error };
  }

  return { data };
}

async function updateNoteInSupabase(noteId, content) {
  const { data, error } = await supabase
    .from("notes")
    .update({ content })
    .eq("id", noteId)
    .select("*");

  if (error) {
    console.error("Supabase Error (Update Note):", error);
    return { error };
  }

  return { data: data[0] };
}

async function deleteNoteFromSupabase(noteId) {
  const { data, error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId)
    .select("*");

  if (error) {
    console.error("Supabase Error (Delete Note):", error);
    return { error };
  }

  return { data: data[0] };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveBookmark") {
    saveBookmarkToSupabase(message.bookmark)
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true; // Keeps the response open for async calls
  }

  if (message.action === "saveChatToFolder") {
    saveChatToFolder(message.chatId, message.folderId, message.user_id)
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
    deleteFolderFromSupabase(message.folderId, message.user_id)
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === "deleteBookmarks") {
    deleteBookmarkFromSupabase(message.bookmarkId, message.user_id)
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === "signUp") {
    signUpWithUsername(message.username, message.password).then(sendResponse);
    return true;
  }
  if (message.action === "signIn") {
    signInWithUsername(message.username, message.password).then(sendResponse);
    return true;
  }
  if (message.action === "signOut") {
    signOut().then(sendResponse);
    return true;
  }

  if (message.action === "deleteChat") {
    deleteChatFromSupabase(message.chatId, message.user_id)
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === "setReminder") {
    setReminderInSupabase(message.reminder)
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === "saveNote") {
    saveNoteToSupabase(message.note)
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === "getNotes") {
    getNotesFromSupabase(message.chatId, message.userId)
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === "updateNote") {
    updateNoteInSupabase(message.noteId, message.content)
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === "deleteNote") {
    deleteNoteFromSupabase(message.noteId)
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === "askDeepSeek") {
    queryDeepSeek(message.prompt).then(sendResponse).catch(sendResponse);
    return true; // Keeps the response open for async calls
  }

  if (message.action === "renameFoldersAndChats") {
    renameItem(
      message.itemId,
      message.newTitle,
      message.itemType,
      message.user_id
    )
      .then((response) => sendResponse(response))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.action === "updateFolderParent") {
    updateFolderParent(message.folderId, message.parentId, message.user_id)
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
    updateChatFolder(message.chatId, message.folderId, message.user_id)
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
      getFoldersFromSupabase(message.user_id),
      getBookmarksFromSupabase(message.user_id),
      getChatsFromSupabase(message.user_id),
      getChatsInFolders(message.user_id),
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

// Initialize reminders when extension starts
loadActiveReminders();

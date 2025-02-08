import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hpkbboqsakdygxojgcsb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwa2Jib3FzYWtkeWd4b2pnY3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0NjQ2NTUsImV4cCI6MjA1NDA0MDY1NX0.3O276DS3wL8Wc9Gh8Vvh7YX_n0KN_-Ib9gZMQsmMp5c";
  
const API_URL = "https://backend-extension-ecru.vercel.app/api";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function queryDeepSeek(prompt) {
  try {
    const response = await fetch(`${API_URL}/deepseek`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await response.json();
    return data?.choices?.[0]?.message?.content || "Error fetching response";
  } catch (error) {
    console.error("DeepSeek API Error:", error);
    return "Error fetching response";
  }
}

// Store for active reminders
let activeReminders = new Map();

// Function to set a reminder
async function setReminderInSupabase(reminder) {
  try {
    const response = await fetch(`${API_URL}/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reminder),
    });
    const { data, error } = await response.json();

    if (error) throw error;

    // Schedule the reminder
    scheduleReminder(data);
    return { data };
  } catch (error) {
    console.error("Set Reminder Error:", error);
    return { error };
  }
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

      fetch(`${API_URL}/reminders/${reminderId}`)
        .then((response) => response.json())
        .then(({ data, error }) => {
          if (!error && data) {
            chrome.tabs.create({ url: data.link });
          }
        });
    }
  }
);

// Function to show Chrome notification
function showNotification(reminder) {
  chrome.notifications.create(`reminder-${reminder.id}`, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("./image/folders.png"),
    title: "Note Reminder",
    message: reminder.note_content,
    priority: 2,
    requireInteraction: true,
    buttons: [{ title: "View Note" }],
  });

  // Update reminder status
  fetch(`${API_URL}/reminders/${reminder.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "completed" }),
  }).catch((error) => console.error("Error updating reminder status:", error));
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
      // Fallback: fetch reminder from API if not in memory
      try {
        const response = await fetch(`${API_URL}/reminders/${reminderId}`);
        const { data, error } = await response.json();
        if (!error && data) {
          showNotification(data);
        }
      } catch (error) {
        console.error("Error fetching reminder:", error);
      }
    }
  }
});

// Load active reminders when extension starts
async function loadActiveReminders() {
  try {
    const response = await fetch(`${API_URL}/reminders/pending`);
    const { data, error } = await response.json();

    if (error) throw error;

    console.log(`Loading ${data.length} active reminders`);
    data.forEach(scheduleReminder);
  } catch (error) {
    console.error("Error loading reminders:", error);
  }
}

// 🔹 Sign Up Function (Username & Password)
async function signUpWithUsername(username, password) {
  try {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const { data, error } = await response.json();

    if (error) throw error;

    chrome.storage.local.set({ user: data });
    return { data };
  } catch (error) {
    return { error: error.message };
  }
}

// 🔹 Sign In Function (Username & Password)
async function signInWithUsername(username, password) {
  try {
    const response = await fetch(`${API_URL}/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const { data, error } = await response.json();

    if (error) throw error;

    chrome.storage.local.set({ user: data });
    return { data };
  } catch (error) {
    return { error: error.message };
  }
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

// Function to set up realtime listener
async function setupRealtimeListener(table) {
  try {
    const response = await fetch(`${API_URL}/realtime/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table }),
    });
    const result = await response.json();

    if (result.success) {
      // Set up Supabase realtime subscription
      supabase
        .channel(`public:${table}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: table },
          (payload) => {
            console.log(`Realtime update received for ${table}:`, payload);
            // Send update to content script
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs.length > 0) {
                chrome.tabs
                  .sendMessage(tabs[0].id, {
                    action: "realtimeUpdate",
                    table: table,
                    type: payload.eventType,
                    data: payload.new || payload.old,
                  })
                  .catch((error) => {
                    console.log("Content script not ready:", error);
                  });
              }
            });
          }
        )
        .subscribe();
    }

    return result;
  } catch (error) {
    console.error("Setup Realtime Error:", error);
    return { error: error.message };
  }
}

// Function to remove realtime listener
async function teardownRealtimeListener(table) {
  try {
    const response = await fetch(`${API_URL}/realtime/teardown`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table }),
    });
    const result = await response.json();

    if (result.success) {
      // Unsubscribe from Supabase channel
      await supabase.channel(`public:${table}`).unsubscribe();
    }

    return result;
  } catch (error) {
    console.error("Teardown Realtime Error:", error);
    return { error: error.message };
  }
}

// Function to set up real-time listeners for all tables
async function setupRealtimeListeners() {
  const tables = [
    "folders",
    "chats",
    "bookmarks",
    "chats_folder",
    "notes",
    "reminders",
  ];

  for (const table of tables) {
    try {
      const result = await setupRealtimeListener(table);
      console.log(`Realtime listener setup for ${table}:`, result);
    } catch (error) {
      console.error(`Failed to setup realtime listener for ${table}:`, error);
    }
  }
}

// Clean up function to remove all realtime listeners
async function cleanupRealtimeListeners() {
  const tables = [
    "folders",
    "chats",
    "bookmarks",
    "chats_folder",
    "notes",
    "reminders",
  ];

  for (const table of tables) {
    try {
      const result = await teardownRealtimeListener(table);
      console.log(`Realtime listener removed for ${table}:`, result);
    } catch (error) {
      console.error(`Failed to remove realtime listener for ${table}:`, error);
    }
  }
}

// Set up listeners when extension starts
setupRealtimeListeners();

// Clean up listeners when extension is unloaded
chrome.runtime.onSuspend.addListener(() => {
  cleanupRealtimeListeners();
});

// CRUD operations for bookmarks
async function saveBookmarkToSupabase(bookmark) {
  try {
    const response = await fetch(`${API_URL}/bookmarks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookmark),
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function getBookmarksFromSupabase(userId) {
  try {
    const response = await fetch(`${API_URL}/bookmarks/${userId}`);
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function deleteBookmarkFromSupabase(bookmarkId) {
  try {
    const response = await fetch(`${API_URL}/bookmarks/${bookmarkId}`, {
      method: "DELETE",
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

// CRUD operations for folders
async function saveFolderToSupabase(folder) {
  try {
    const response = await fetch(`${API_URL}/folders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(folder),
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function getFoldersFromSupabase(userId) {
  try {
    const response = await fetch(`${API_URL}/folders/${userId}`);
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function updateFolderParent(folderId, parentId, userId) {
  try {
    const response = await fetch(`${API_URL}/folders/${folderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parent_id: parentId }),
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function deleteFolderFromSupabase(folderId) {
  try {
    const response = await fetch(`${API_URL}/folders/${folderId}`, {
      method: "DELETE",
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

// CRUD operations for chats
async function saveChatToSupabase(chat) {
  try {
    const response = await fetch(`${API_URL}/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chat),
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function getChatsFromSupabase(userId) {
  try {
    const response = await fetch(`${API_URL}/chats/${userId}`);
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function deleteChatFromSupabase(chatId) {
  try {
    const response = await fetch(`${API_URL}/chats/${chatId}`, {
      method: "DELETE",
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

// CRUD operations for chats_folder
async function saveChatToFolder(chatId, folderId, userId) {
  try {
    const response = await fetch(`${API_URL}/chats-folder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        folder_id: folderId,
        user_id: userId,
      }),
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function getChatsInFolders(userId) {
  try {
    const response = await fetch(`${API_URL}/chats-folder/${userId}`);
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function updateChatFolder(chatId, newFolderId, userId) {
  try {
    const response = await fetch(`${API_URL}/chats-folder/${chatId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newFolderId, user_id: userId }),
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

// CRUD operations for notes
async function saveNoteToSupabase(note) {
  try {
    const response = await fetch(`${API_URL}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(note),
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function getNotesFromSupabase(chatId, userId) {
  try {
    const response = await fetch(`${API_URL}/notes/${chatId}/${userId}`);
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function updateNoteInSupabase(noteId, content) {
  try {
    const response = await fetch(`${API_URL}/notes/${noteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function deleteNoteFromSupabase(noteId) {
  try {
    const response = await fetch(`${API_URL}/notes/${noteId}`, {
      method: "DELETE",
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function renameItem(itemId, newTitle, itemType, userId) {
  try {
    const response = await fetch(`${API_URL}/${itemType}s/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: itemType === "folder" ? `📁${newTitle}` : newTitle,
        user_id: userId,
      }),
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
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

  if (message.action === "setupRealtimeListener") {
    setupRealtimeListener(message.table)
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (message.action === "teardownRealtimeListener") {
    teardownRealtimeListener(message.table)
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
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

# Flowdesk - Google Sheets & Apps Script Backend Setup

Flowdesk uses Google Sheets as its serverless database, mediated by a Google Apps Script Web App API.

Follow these exact steps to connect your own Google Sheet:

---

### Step 1: Create a Google Spreadsheet
1. Go to [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Name the sheet **Flowdesk Database** (or any name you prefer).

---

### Step 2: Open Google Apps Script
1. In your new Google Sheet, click **Extensions** in the top menu bar.
2. Select **Apps Script**. A new tab will open with the script editor.
3. Rename the Apps Script project to **Flowdesk API** (top left).

---

### Step 3: Paste the Server Code
1. In the Apps Script code editor, delete any existing code inside `Code.gs`.
2. Open [`apps-script/Code.gs`](./apps-script/Code.gs) in this repository, copy its entire contents, and paste it into the Apps Script editor.
3. Click the **Save** icon (disk icon or `Ctrl + S` / `Cmd + S`).

---

### Step 4: Run Initial Schema Setup
1. In the Apps Script editor toolbar, ensure the function dropdown has **`setup`** selected.
2. Click **Run**.
3. Google will request permissions to access your spreadsheet. Click **Review Permissions**, choose your Google account, click **Advanced**, and then click **Go to Flowdesk API (unsafe)**, then click **Allow**.
4. Check the **Execution log** at the bottom to verify it displays:  
   `Flowdesk setup completed successfully.`
5. Switch back to your Google Sheet tab. You will see all required database tabs initialized with their header rows:
   - `Projects`
   - `Departments`
   - `Stages`
   - `Tasks`
   - `Ideas`
   - `TimeLogs`
   - `Templates`
   - `Settings`

---

### Step 5: Configure the Secret Token
1. In the Apps Script editor, open the left sidebar and click **Project Settings** (gear icon ⚙️).
2. Scroll down to **Script Properties** and click **Add script property**.
3. Enter:
   - **Property**: `FLOWDESK_API_TOKEN`
   - **Value**: Any secure secret passphrase or random string you choose (e.g. `flowdesk_sec_9f81a7b2c0e4418`).
4. Click **Save script properties**.

*(Alternative method: In the code editor, temporarily run `setApiToken("your-secret-token")` from the function selector).*

---

### Step 6: Deploy as Web App
1. In the Apps Script editor, click the blue **Deploy** button (top right) > **New deployment**.
2. Click the gear icon ⚙️ next to *Select type* and choose **Web app**.
3. Fill in the deployment details:
   - **Description**: `Flowdesk Production API`
   - **Execute as**: **Me (your-email@gmail.com)** *(Required so it can read/write your sheet)*
   - **Who has access**: **Anyone** *(Required so the client web app can send requests with your secret token)*
4. Click **Deploy**.
5. Copy the generated **Web app URL** (starts with `https://script.google.com/macros/s/.../exec`).

---

### Step 7: Configure Flowdesk Frontend (.env)
1. In your local Flowdesk project root directory, create a `.env` file (copy from `.env.example` if present):
   ```env
   VITE_API_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
   VITE_API_TOKEN="your-chosen-secret-token"
   ```
2. Save the file.
3. Restart your Vite dev server (`npm run dev`) or rebuild your app.
4. Flowdesk will now automatically connect to your Google Sheet! If `.env` is omitted or left blank, Flowdesk seamlessly runs in **Local Mock Data** mode with offline persistence.

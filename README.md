# <img src="./public/favicon.svg" alt="Project Logo" width="30" height="30" style="vertical-align: middle; margin-right: 8px;"> GPT Image Playground

A web-based playground to interact with OpenAI's GPT image models (`gpt-image-2`, `gpt-image-1.5`, `gpt-image-1`, and `gpt-image-1-mini`) for generating and editing images.

> **Note:** The playground defaults to `gpt-image-2`, OpenAI's latest GPT image model. It supports arbitrary resolutions up to 4K (with constraint validation) in addition to the legacy fixed sizes.

<p align="center">
  <img src="./readme-images/interface.jpg" alt="Interface" width="600"/>
</p>

## ✨ Features

*   **🎨 Image Generation Mode:** Create new images from text prompts.
*   **🖌️ Image Editing Mode:** Modify existing images based on text prompts and optional masks.
*   **⚙️ Full API Parameter Control:** Access and adjust all relevant parameters supported by the OpenAI Images API directly through the UI (size, quality, output format, compression, background, moderation, number of images).
*   **📐 Custom Resolutions (gpt-image-2):** Pick from 2K/4K presets or enter an arbitrary Width × Height with live validation against the model's constraints (multiples of 16, max 3840px per edge, ≤ 3:1 aspect ratio, 655,360 to 8,294,400 total pixels).
*   **🎭 Integrated Masking Tool:** Easily create or upload masks directly within the editing mode to specify areas for modification. Draw directly on the image to generate a mask.

     > ⚠️ Please note that `gpt-image-1`'s masking feature does not guarantee 100% control at this time. <br>1) [It's a known & acknowledged model limitation.](https://community.openai.com/t/gpt-image-1-problems-with-mask-edits/1240639/37) <br>2) [OpenAI are looking to address it in a future update.](https://community.openai.com/t/gpt-image-1-problems-with-mask-edits/1240639/41)
<p align="center">
  <img src="./readme-images/mask-creation.jpg" alt="Interface" width="350"/>
</p>

*   **📜 Detailed History & Cost Tracking:**
    *   View a comprehensive history of all your image generations and edits.
    *   See the parameters used for each request.
    *   Get detailed API token usage and estimated cost breakdowns (`$USD`) for each operation. (hint: click the `$` amount on the image)
    *   View the full prompt used for each history item.
    *   View total historical API cost.
    *   Delete items from history

<p align="center">
  <img src="./readme-images/history.jpg" alt="Interface" width="1306"/>
</p>

<p align="center">
  <img src="./readme-images/cost-breakdown.jpg" alt="Interface" width="350"/>
</p>

*   **🖼️ Flexible Image Output View:** View generated image batches as a grid or select individual images for a closer look.
*   **🚀 Send to Edit:** Quickly send any generated or history image directly to the editing form.
*   **📋 Paste to Edit:** Paste images directly from your clipboard into the Edit mode's source image area.
*   **🔐 Runtime API Settings:** Change the server-side OpenAI API key and base URL from the UI without restarting the app. New requests use the updated settings immediately.
*   **💾 Storage:** Supports two modes via `NEXT_PUBLIC_IMAGE_STORAGE_MODE`:
    *   **Filesystem (default):** Images saved to `./generated-images` on the server.
    *   **IndexedDB:** Images saved directly in the browser's IndexedDB (ideal for serverless deployments).
    *   Generation history metadata is always saved in the browser's local storage.

## ▲ Deploy to Vercel

🚨 *CAUTION: If you deploy from `main` or `master` branch, your Vercel deployment will be **publicly available** to anyone who has the URL. Deploying from other branches will require users to be logged into Vercel (on your team) to access the preview build.* 🚨

You can deploy your own instance of this playground to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/alasano/gpt-image-1-playground&env=OPENAI_API_KEY,NEXT_PUBLIC_IMAGE_STORAGE_MODE,APP_PASSWORD&envDescription=OpenAI%20API%20Key%20is%20required.%20Set%20storage%20mode%20to%20indexeddb%20for%20Vercel%20deployments.&project-name=gpt-image-playground&repository-name=gpt-image-playground)

You will be prompted to enter your `OPENAI_API_KEY` and `APP_PASSWORD` during the deployment setup. For Vercel deployments, it's required to set `NEXT_PUBLIC_IMAGE_STORAGE_MODE` to `indexeddb`. 

> **Important:** The runtime API settings UI stores overrides on the server filesystem. That works well on Docker, a VM, or a persistent disk, but it is **not a durable configuration mechanism on Vercel** or other ephemeral serverless hosts. On Vercel, prefer environment variables.

Note: If `NEXT_PUBLIC_IMAGE_STORAGE_MODE` is not set, the application will automatically detect if it's running on Vercel (using the `VERCEL` or `NEXT_PUBLIC_VERCEL_ENV` environment variables) and default to `indexeddb` mode in that case. Otherwise (e.g., running locally), it defaults to `fs` mode. You can always explicitly set the variable to `fs` or `indexeddb` to override this automatic behavior.

## 🐳 Docker Deployment

This repository includes a `Dockerfile` and `docker-compose.yml` for a persistent self-hosted deployment.

### 1. Create `.env`

`OPENAI_API_KEY` is now optional at startup. You can set it here, or leave it unset and configure it later from the **API Settings** button in the UI.

```dotenv
NEXT_PUBLIC_IMAGE_STORAGE_MODE=fs
APP_PASSWORD=change-me

# Optional defaults
# OPENAI_API_KEY=sk-...
# OPENAI_API_BASE_URL=https://your-openai-compatible-endpoint/v1
```

If you expose this UI beyond a private LAN, setting `APP_PASSWORD` is strongly recommended.

### 2. Start the container

```bash
docker compose up -d --build
docker compose logs -f
```

Then open `http://localhost:3000`.

### 3. Configure or rotate the API key from the UI

1. Click **API Settings** in the top-right corner.
2. If `APP_PASSWORD` is set, enter that password first.
3. Paste a new API key into **New API key** and click **Save**.
4. New image requests will use the updated key immediately. No container restart is required.

The runtime settings are persisted in `/app/data/runtime-config.json`, which `docker-compose.yml` stores in the `gpt-image-config` Docker volume.

### Runtime override behavior

*   A saved runtime API key overrides `OPENAI_API_KEY`.
*   A saved runtime base URL overrides `OPENAI_API_BASE_URL`.
*   **Clear Saved API Key** removes only the runtime API key override.
*   **Reset Runtime Overrides** deletes all saved runtime overrides and falls back to environment variables again.

## 🚀 Getting Started [Local Deployment]

Follow these steps to get the playground running locally.

### Prerequisites

*   [Node.js](https://nodejs.org/) (Version 20 or later required)
*   [npm](https://www.npmjs.com/), [yarn](https://yarnpkg.com/), [pnpm](https://pnpm.io/), or [bun](https://bun.sh/)

### 1. Configure Environment 🟢

You can provide an API key up front via environment variables, or configure it later from the UI.

⚠️ [Your OpenAI Organization needs to be verified to use GPT Image models](https://help.openai.com/en/articles/10910291-api-organization-verification)

1.  If you don't have a `.env.local` file, create one.
2.  Add any environment variables you want to use:

    ```dotenv
    # Optional at startup; can also be set later in API Settings
    OPENAI_API_KEY=your_openai_api_key_here

    # Optional OpenAI-compatible endpoint
    OPENAI_API_BASE_URL=your_compatible_api_endpoint_here

    # Recommended if you want to protect the UI and runtime settings
    APP_PASSWORD=your_password_here
    ```

    **Important:** Keep your API key secret. The `.env.local` file is included in `.gitignore` by default to prevent accidental commits.

3.  If you prefer not to keep a key in `.env.local`, leave `OPENAI_API_KEY` unset and add it after startup from the **API Settings** button in the UI.

---

#### 🟡 (Optional) IndexedDB Mode (for serverless hosts) [e.g. Vercel]

For environments where the filesystem is read-only or ephemeral (like Vercel serverless functions), you can configure the application to store generated images directly in the browser's IndexedDB using Dexie.js.

Set the following environment variable in your `.env.local` file or directly in your hosting provider's UI (like Vercel):

```dotenv
NEXT_PUBLIC_IMAGE_STORAGE_MODE=indexeddb
```

When this variable is set to `indexeddb`:
*   The server API (`/api/images`) will return the image data as base64 (`b64_json`) instead of saving it to disk.
*   The client-side application will decode the base64 data and store the image blob in IndexedDB.
*   Images will be served directly from the browser's storage using Blob URLs.

If this variable is **not set** or has any other value, the application defaults to the standard behavior of saving images to the `./generated-images` directory on the server's filesystem.

**Note:** If `NEXT_PUBLIC_IMAGE_STORAGE_MODE` is not set, the application will automatically detect if it's running on Vercel (using the `VERCEL` or `NEXT_PUBLIC_VERCEL_ENV` environment variables) and default to `indexeddb` mode in that case. Otherwise (e.g., running locally), it defaults to `fs` mode. You can always explicitly set the variable to `fs` or `indexeddb` to override this automatic behavior.

#### 🟡 (Optional) Use a Custom API Endpoint

If you need to use an OpenAI-compatible API endpoint (e.g., a local model server or a different provider), you can specify its base URL using the `OPENAI_API_BASE_URL` environment variable in your `.env.local` file:

```dotenv
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_API_BASE_URL=your_compatible_api_endpoint_here
```

If `OPENAI_API_BASE_URL` is not set, the application will default to the standard OpenAI API endpoint.

---

#### 🟡 (Optional) Runtime API Settings via the UI

The **API Settings** button in the top-right corner lets you save a runtime API key and base URL without restarting the app.

*   Leaving the **New API key** field blank keeps the current key unchanged.
*   Clearing the **Base URL** field and saving falls back to `OPENAI_API_BASE_URL` or the OpenAI default endpoint.
*   **Reset Runtime Overrides** deletes the saved runtime config file and returns to environment variables.

Runtime settings are stored in `./data/runtime-config.json` for local runs.

---


#### 🟡 (Optional) Enable Password Validation
```dotenv
APP_PASSWORD=your_password_here
```
When `APP_PASSWORD` is set, the frontend will prompt you for a password to authenticate requests and to open the runtime API settings dialog.
<p align="center">
  <img src="./readme-images/password-dialog.jpg" alt="Password Dialog" width="460"/>
</p>

---

### 2. Install Dependencies 🟢

Navigate to the project directory in your terminal and install the necessary packages:

```bash
npm install
# or
# yarn install
# or
# pnpm install
# or
# bun install
```

### 3. Run the Development Server 🟢

Start the Next.js development server:

```bash
npm run dev
# or
# yarn dev
# or
# pnpm dev
# or
# bun dev
```

### 4. Open the Playground 🟢

Open [http://localhost:3000](http://localhost:3000) in your web browser. You should now be able to use GPT Image Playground.
If you did not set `OPENAI_API_KEY` in `.env.local`, click **API Settings** and add it there before generating images.

## 🤝 Contributing

Contributions are welcome! Issues and feature requests, not as much welcome but I'll think about it.

## 📄 License

MIT

const express = require("express");
const multer = require("multer");
const Minio = require("minio");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const upload = multer({ storage: multer.memoryStorage() });

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "minio";
const PUBLIC_HOST = process.env.MINIO_PUBLIC_HOST || "localhost";
const MINIO_PORT = parseInt(process.env.MINIO_PORT) || 9000;

const minioClient = new Minio.Client({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

const BUCKET_NAME = "photo-storage";
const imageMetadata = [];

function normalizeMetadata(stat, fileName) {
  const meta = stat.metaData || {};

  const getVal = (keys) => {
    for (const k of keys) {
      if (meta[k]) return meta[k];
      if (meta[k.toLowerCase()]) return meta[k.toLowerCase()];
    }
    return "";
  };

  return {
    id: Date.now() + Math.random(),
    fileName: fileName,
    title: getVal(["x-amz-meta-title", "Title", "title"]) || fileName,
    description: getVal([
      "x-amz-meta-description",
      "Description",
      "description",
    ]),
    tags: getVal(["x-amz-meta-tags", "Tags", "tags"]),
    location: getVal(["x-amz-meta-location", "Location", "location"]),

    uploadDate:
      getVal(["x-amz-meta-upload-date", "UploadDate"]) || stat.lastModified,
    size: stat.size,
    mimeType:
      getVal(["content-type", "Content-Type"]) || "application/octet-stream",
    url: `http://${PUBLIC_HOST}:${MINIO_PORT}/${BUCKET_NAME}/${fileName}`,
  };
}

// 1. INIT BUCKET
async function initBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, "us-east-1");
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
          },
        ],
      };
      await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
      console.log("✅ Bucket created & policy applied.");
    }
  } catch (err) {
    console.error("❌ Bucket Init Error:", err);
  }
}

// 2. LOAD EXISTING IMAGES
async function loadExistingImages() {
  imageMetadata.length = 0;

  console.log("🔄 Recovering metadata from MinIO files...");

  const stream = minioClient.listObjects(BUCKET_NAME, "", true);

  stream.on("data", async (obj) => {
    try {
      const stat = await minioClient.statObject(BUCKET_NAME, obj.name);
      const recoveredData = normalizeMetadata(stat, obj.name);

      imageMetadata.push(recoveredData);
    } catch (err) {
      console.error(`❌ Failed to recover ${obj.name}:`, err.message);
    }
  });

  stream.on("end", () => {
    setTimeout(() => {
      console.log(
        `✅ Recovery complete. Loaded ${imageMetadata.length} images.`
      );
    }, 1000);
  });
}

// 3. INIT SERVER
(async () => {
  await initBucket();
  await loadExistingImages();
})();

// --- ROUTES ---

// Upload
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });

    const safeName = req.file.originalname.replace(/\s+/g, "_");
    const fileName = `${Date.now()}_${safeName}`;

    const metaHeaders = {
      "Content-Type": req.file.mimetype,
      "x-amz-meta-title": req.body.title || "",
      "x-amz-meta-description": req.body.description || "",
      "x-amz-meta-tags": req.body.tags || "",
      "x-amz-meta-location": req.body.location || "",
      "x-amz-meta-upload-date": new Date().toISOString(),
    };

    await minioClient.putObject(
      BUCKET_NAME,
      fileName,
      req.file.buffer,
      req.file.buffer.length,
      metaHeaders
    );

    const newImage = {
      id: Date.now(),
      fileName: fileName,
      title: req.body.title || fileName,
      description: req.body.description || "",
      tags: req.body.tags || "",
      location: req.body.location || "",
      uploadDate: metaHeaders["x-amz-meta-upload-date"],
      size: req.file.size,
      mimeType: req.file.mimetype,
      url: `http://${PUBLIC_HOST}:${MINIO_PORT}/${BUCKET_NAME}/${fileName}`,
    };

    imageMetadata.push(newImage);
    res.json(newImage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// List Images
app.get("/images", (req, res) => {
  const sorted = [...imageMetadata].sort(
    (a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)
  );
  res.json(sorted);
});

// Search
app.get("/search", (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const results = imageMetadata.filter(
    (img) =>
      (img.title && img.title.toLowerCase().includes(q)) ||
      (img.description && img.description.toLowerCase().includes(q)) ||
      (img.tags && img.tags.toLowerCase().includes(q))
  );
  res.json(results);
});

// Delete
app.delete("/delete/:fileName", async (req, res) => {
  try {
    await minioClient.removeObject(BUCKET_NAME, req.params.fileName);

    const idx = imageMetadata.findIndex(
      (img) => img.fileName === req.params.fileName
    );
    if (idx !== -1) imageMetadata.splice(idx, 1);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

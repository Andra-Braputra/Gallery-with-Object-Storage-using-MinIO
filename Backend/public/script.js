const API_URL = "http://localhost:3000";

// ----------------------------
// 1. Core Functions
// ----------------------------
async function fetchImages(endpoint = "/images") {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML =
    '<p style="text-align:center; width:100%;">Updating gallery...</p>';

  try {
    const res = await fetch(`${API_URL}${endpoint}`);
    if (!res.ok) throw new Error("Server error");

    const items = await res.json();
    renderGallery(items);
  } catch (err) {
    console.error(err);
    gallery.innerHTML = `<p style='color:red; text-align:center;'>Gagal terhubung ke server (${err.message})</p>`;
  }
}

function renderGallery(items) {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";

  if (items.length === 0) {
    gallery.innerHTML =
      "<p style='text-align:center; width:100%; color:#888;'>Tidak ada gambar ditemukan.</p>";
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "gallery-item";

    const img = document.createElement("img");
    img.src = item.url;
    img.loading = "lazy";

    const info = document.createElement("div");
    info.className = "gallery-info";
    info.innerHTML = `<div class="gallery-title">${
      item.title || "Untitled"
    }</div>`;

    card.appendChild(img);
    card.appendChild(info);

    card.onclick = () => showMetadataPreview(item);
    gallery.appendChild(card);
  });
}

// ----------------------------
// 2. Search & Filter
// ----------------------------
function handleSearch() {
  const query = document.getElementById("searchInput").value.trim();
  fetchImages(query ? `/search?q=${encodeURIComponent(query)}` : "/images");
}

function resetSearch() {
  document.getElementById("searchInput").value = "";
  fetchImages("/images");
}

document.getElementById("searchInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleSearch();
});

// ----------------------------
// 3. Upload Handler
// ----------------------------
document.getElementById("uploadForm").onsubmit = async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  const originalText = btn.textContent;

  btn.disabled = true;
  btn.textContent = "Uploading...";

  const formData = new FormData(e.target);

  try {
    const res = await fetch(`${API_URL}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");

    e.target.reset();
    resetSearch();
    alert("Upload Berhasil!");
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
};

// ----------------------------
// 4. Modal & Delete Logic
// ----------------------------
function showMetadataPreview(data) {
  const modal = document.getElementById("previewModal");

  document.getElementById("previewImage").src = data.url;
  document.getElementById("metaTitle").textContent = data.title || "Untitled";
  document.getElementById("metaDescription").textContent =
    data.description || "-";
  document.getElementById("metaLocation").textContent = data.location || "-";

  const tagsContainer = document.getElementById("metaTags");
  tagsContainer.innerHTML = "";
  if (data.tags) {
    data.tags.split(",").forEach((tag) => {
      if (tag.trim() === "") return;
      const span = document.createElement("span");
      span.className = "tag-badge";
      span.textContent = tag.trim();
      tagsContainer.appendChild(span);
    });
  } else {
    tagsContainer.textContent = "-";
  }

  const dateStr = data.uploadDate
    ? new Date(data.uploadDate).toLocaleString("id-ID")
    : "-";
  document.getElementById("metaUploadDate").textContent = dateStr;
  const sizeKB = data.size ? (data.size / 1024).toFixed(2) + " KB" : "0 KB";
  document.getElementById("metaSize").textContent = sizeKB;
  document.getElementById("metaMime").textContent = data.mimeType || "Unknown";

  document.getElementById("downloadBtn").onclick = () => {
    window.open(data.url, "_blank");
  };

  const deleteBtn = document.getElementById("deleteBtn");

  deleteBtn.onclick = async () => {
    const confirmDelete = confirm(
      `Apakah Anda yakin ingin menghapus "${data.title || "gambar ini"}"?`
    );

    if (confirmDelete) {
      deleteBtn.textContent = "Deleting...";
      deleteBtn.disabled = true;

      try {
        const res = await fetch(`${API_URL}/delete/${data.fileName}`, {
          method: "DELETE",
        });

        if (!res.ok) throw new Error("Gagal menghapus file");

        alert("File berhasil dihapus!");

        modal.classList.remove("show");
        handleSearch();
      } catch (err) {
        alert("Error: " + err.message);
      } finally {
        deleteBtn.textContent = "Hapus";
        deleteBtn.disabled = false;
      }
    }
  };

  modal.classList.add("show");
}

document.getElementById("closePreview").onclick = () => {
  document.getElementById("previewModal").classList.remove("show");
};

window.onclick = (event) => {
  const modal = document.getElementById("previewModal");
  if (event.target == modal) {
    modal.classList.remove("show");
  }
};

// Init
fetchImages();

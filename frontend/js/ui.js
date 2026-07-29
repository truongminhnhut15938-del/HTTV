const content = document.getElementById("content");

function showFileInfo(file, text = "") {

    const sizeKB = (file.size / 1024).toFixed(2);

    content.innerHTML = `
        <div class="document-card">

            <h2>📄 ${file.name}</h2>

            <p><b>Kích thước:</b> ${sizeKB} KB</p>

            <hr>

            <pre class="document-content">${text}</pre>

        </div>
    `;
}

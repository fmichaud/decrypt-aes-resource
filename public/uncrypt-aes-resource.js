document.addEventListener('DOMContentLoaded', function () {
    const { createApp } = Vue;
    const { createVuetify } = Vuetify;
    const vuetify = createVuetify();

    createApp({
        data() {
            return {
                password: '',
                decryptedText: '',
                decryptedMarkdown: '',
                error: '',
                isMarkdown: false,
                fileUrl: ''
            };
        },
        mounted() {
            // Get the file URL from the query string using URLSearchParams
            const urlParams = new URLSearchParams(window.location.search);
            this.fileUrl = urlParams.get('url');
            
            if (this.fileUrl) {
                console.log('File URL from query string:', this.fileUrl);
                this.checkFileExtension();
            } else {
                console.error('Error: No URL provided in query string.');
                this.error = 'No file URL provided in the query string.';
            }
        },
        methods: {
            async fetchIVFromURL() {
                const ivUrl = this.fileUrl.replace(/\.enc$/, '.iv');
                console.log('IV URL:', ivUrl);

                try {
                    const response = await fetch(ivUrl);
                    if (!response.ok) {
                        throw new Error(`Unable to fetch the IV from the specified URL. Status: ${response.status}`);
                    }
                    console.log('IV fetched successfully');
                    return await response.arrayBuffer();
                } catch (err) {
                    console.error('Error fetching IV:', err.message);
                    throw err;
                }
            },
            async fetchSaltFromURL() {
                const saltUrl = this.fileUrl.replace(/\.enc$/, '.salt');
                console.log('Salt URL:', saltUrl);

                try {
                    const response = await fetch(saltUrl);
                    if (!response.ok) {
                        throw new Error(`Unable to fetch the Salt from the specified URL. Status: ${response.status}`);
                    }
                    console.log('Salt fetched successfully');
                    return await response.arrayBuffer();
                } catch (err) {
                    console.error('Error fetching Salt:', err.message);
                    throw err;
                }
            },
            async decryptFile() {
                if (!this.password || !this.fileUrl) {
                    this.error = 'Please provide the password and file URL.';
                    return;
                }

                console.log('Starting decryption...');
                try {
                    const iv = await this.fetchIVFromURL();
                    const salt = await this.fetchSaltFromURL();
                    const encryptedData = await fetch(this.fileUrl).then(res => res.arrayBuffer());
                    console.log('Encrypted data fetched successfully');

                    const passwordKey = await crypto.subtle.importKey(
                        "raw",
                        new TextEncoder().encode(this.password),
                        { name: "PBKDF2" },
                        false,
                        ["deriveKey"]
                    );
                    console.log('Password key imported successfully');

                    const derivedKey = await crypto.subtle.deriveKey(
                        {
                            name: "PBKDF2",
                            salt: salt,
                            iterations: 100000,
                            hash: "SHA-256"
                        },
                        passwordKey,
                        { name: "AES-CBC", length: 256 },
                        true,
                        ["decrypt"]
                    );
                    console.log('Derived key generated successfully');

                    const decrypted = await crypto.subtle.decrypt(
                        { name: "AES-CBC", iv: iv },
                        derivedKey,
                        encryptedData
                    );
                    console.log('Decryption successful');

                    const decoder = new TextDecoder();
                    this.decryptedText = decoder.decode(decrypted);
                    this.error = '';

                    if (this.isMarkdown) {
                        this.decryptedMarkdown = marked.parse(this.decryptedText);
                    }

                    console.log('Decrypted Text:', this.decryptedText);
                } catch (err) {
                    this.error = "Decryption error: " + err.message;
                    console.error(this.error);
                }
            },
            checkFileExtension() {
                if (this.fileUrl && this.fileUrl.endsWith('.md')) {
                    this.isMarkdown = true;
                }
                console.log('Is Markdown:', this.isMarkdown);
            }
        }
    }).use(vuetify).mount('#app');
});

// Include the latest version of marked from CDN
// <script src="https://cdn.jsdelivr.net/npm/marked@5.0.2/marked.min.js"></script>

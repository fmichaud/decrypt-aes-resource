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
            const urlParams = new URLSearchParams(window.location.search);
            this.fileUrl = urlParams.get('url');
            console.log('File URL:', this.fileUrl); // Debug log to check the file URL
            this.checkFileExtension();
        },
        methods: {
            async fetchIVFromURL() {
                const ivUrl = this.fileUrl.replace(/\.enc$/, '.iv');
                console.log('IV URL:', ivUrl); // Debug log to check the IV URL

                try {
                    const response = await fetch(ivUrl);
                    if (!response.ok) {
                        throw new Error(`Unable to fetch the IV from the specified URL. Status: ${response.status}`);
                    }
                    console.log('IV fetched successfully'); // Log on successful IV fetch
                    return await response.arrayBuffer();
                } catch (err) {
                    console.error('Error fetching IV:', err.message); // Log IV fetch error
                    throw err;
                }
            },
            async decryptFile() {
                if (!this.password || !this.fileUrl) {
                    this.error = 'Please provide the password and file URL.';
                    console.error(this.error); // Log missing password or file URL
                    return;
                }
                console.log('Starting decryption...'); // Log decryption start
                try {
                    const iv = await this.fetchIVFromURL();
                    const encryptedData = await fetch(this.fileUrl).then(res => res.arrayBuffer());
                    console.log('Encrypted data fetched successfully'); // Log successful encrypted data fetch

                    const key = await crypto.subtle.importKey(
                        "raw",
                        new TextEncoder().encode(this.password),
                        { name: "PBKDF2" },
                        false,
                        ["deriveKey"]
                    );
                    console.log('Key imported successfully'); // Log key import success

                    const derivedKey = await crypto.subtle.deriveKey(
                        {
                            name: "PBKDF2",
                            salt: new TextEncoder().encode("salt"),
                            iterations: 100000,
                            hash: "SHA-256"
                        },
                        key,
                        { name: "AES-CBC", length: 256 },
                        true,
                        ["decrypt"]
                    );
                    console.log('Derived key generated successfully'); // Log key derivation success

                    const decrypted = await crypto.subtle.decrypt(
                        { name: "AES-CBC", iv: iv },
                        derivedKey,
                        encryptedData
                    );
                    console.log('Decryption successful'); // Log decryption success

                    const decoder = new TextDecoder();
                    this.decryptedText = decoder.decode(decrypted);
                    this.error = '';

                    if (this.isMarkdown) {
                        this.decryptedMarkdown = marked(this.decryptedText);
                    }

                    console.log('Decrypted Text:', this.decryptedText); // Log decrypted text
                } catch (err) {
                    this.error = "Decryption error: " + err.message;
                    console.error(this.error); // Log decryption error
                    this.decryptedText = '';
                    this.decryptedMarkdown = '';
                }
            },
            checkFileExtension() {
                if (this.fileUrl && this.fileUrl.endsWith('.md')) {
                    this.isMarkdown = true;
                }
                console.log('Is Markdown:', this.isMarkdown); // Log markdown check
            }
        }
    }).use(vuetify).mount('#app');
});


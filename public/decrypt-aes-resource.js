document.addEventListener('DOMContentLoaded', function () {
    const { createApp } = Vue;
    const { createVuetify } = Vuetify;
    const vuetify = createVuetify();

    const app = createApp({
        data() {
            return {
                password: localStorage.getItem('password') || '',
                decryptedText: '',
                error: '',
                isMarkdown: false,
                fileUrl: '',
                passwordEntered: !!localStorage.getItem('password'),
                lastAccessTime: localStorage.getItem('lastAccessTime') || null,
            };
        },
        mounted() {
            this.checkExpiration();

            const urlParams = new URLSearchParams(window.location.search);
            this.fileUrl = urlParams.get('url');

            if (this.fileUrl) {
                this.checkFileExtension();
            } else {
                this.error = 'No file URL provided in the query string.';
            }

            if (this.password) {
                this.decryptFile();
            }
        },
        methods: {
            async decryptFile() {
                try {
                    const iv = await this.fetchIVFromURL();
                    const salt = await this.fetchSaltFromURL();
                    const encryptedData = await fetch(this.fileUrl).then(res => res.arrayBuffer());

                    const passwordKey = await crypto.subtle.importKey(
                        "raw",
                        new TextEncoder().encode(this.password),
                        { name: "PBKDF2" },
                        false,
                        ["deriveKey"]
                    );

                    const derivedKey = await crypto.subtle.deriveKey(
                        { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
                        passwordKey,
                        { name: "AES-CBC", length: 256 },
                        true,
                        ["decrypt"]
                    );

                    const decrypted = await crypto.subtle.decrypt(
                        { name: "AES-CBC", iv: iv },
                        derivedKey,
                        encryptedData
                    );

                    const decoder = new TextDecoder();
                    this.decryptedText = decoder.decode(decrypted);

                    localStorage.setItem('password', this.password);
                    localStorage.setItem('lastAccessTime', new Date().getTime());
                    this.passwordEntered = true;

                    await this.updateMarkdown();
                } catch (err) {
                    this.error = "Decryption error: " + err.message;
                }
            },
            async updateMarkdown() {
                this.$nextTick(() => {
                    // Find the content rendered by VueShowdown
                    const content = document.querySelector('.vue-showdown-content');
                    if (content) {
                        // Find all tables in the rendered content
                        const tables = content.querySelectorAll('table');
                        
                        tables.forEach((table) => {
                            // Create a div wrapper for responsive tables
                            const wrapper = document.createElement('div');
                            wrapper.classList.add('table-responsive');
                            
                            // Insert the wrapper before the table and move the table inside it
                            table.parentNode.insertBefore(wrapper, table);
                            wrapper.appendChild(table);
                        });
                    }
                });
            },
            checkExpiration() {
                const currentTime = new Date().getTime();
                const lastAccess = this.lastAccessTime ? parseInt(this.lastAccessTime) : null;

                if (lastAccess && (currentTime - lastAccess > 3600000)) {
                    this.clearPassword();
                }
            },
            async fetchIVFromURL() {
                const ivUrl = this.fileUrl.replace(/\.enc$/, '.iv');
                const response = await fetch(ivUrl);
                if (!response.ok) {
                    throw new Error(`Unable to fetch the IV. Status: ${response.status}`);
                }
                return await response.arrayBuffer();
            },
            async fetchSaltFromURL() {
                const saltUrl = this.fileUrl.replace(/\.enc$/, '.salt');
                const response = await fetch(saltUrl);
                if (!response.ok) {
                    throw new Error(`Unable to fetch the Salt. Status: ${response.status}`);
                }
                return await response.arrayBuffer();
            },
            checkFileExtension() {
                if (this.fileUrl.endsWith('.md')) {
                    this.isMarkdown = true;
                }
            },
            clearPassword() {
                localStorage.removeItem('password');
                localStorage.removeItem('lastAccessTime');
                this.password = '';
                this.passwordEntered = false;
                this.decryptedText = '';
            }
        }
    });

    app.component('vue-showdown', VueShowdown);

    app.use(vuetify).mount('#app');
});

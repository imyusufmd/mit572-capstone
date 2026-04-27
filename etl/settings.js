module.exports = {
    // Disable credential encryption so entrypoint.sh can write plaintext creds
    credentialSecret: false,

    // Allow function nodes to access Node.js built-ins
    functionExternalModules: true,

    // Expose env vars to all function nodes via env.get()
    functionGlobalContext: {},

    // Logging
    logging: {
        console: {
            level: "info",
            metrics: false,
            audit: false
        }
    },

    // Editor settings
    editorTheme: {
        tours: false
    }
};

module.exports = {
  apps: [{
    name: "backend",
    script: "./api/server.js",
    instances: "max",  // Usará todos os cores disponíveis
    exec_mode: "fork",
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    },
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm Z"
  }]
};

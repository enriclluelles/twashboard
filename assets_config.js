({
  optimize: "none",
  appDir: "public_src/js", // relative to this file
  dir: "public/js", // just build into the same directory
  baseUrl: "./", // relative to appDir above (app)
  modules: [
    { name: "app"},
  ]
})

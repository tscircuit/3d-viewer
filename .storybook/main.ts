import type { StorybookConfig } from "@storybook/react-vite"

const addProxyLogging = (proxy: any) => {
  proxy.on("error", (err, req, res) => {
    console.error("proxy error", err)
  })
  proxy.on("proxyReq", (proxyReq, req, res) => {
    console.log("Sending Request to the Target:", req.method, req.url)
  })
  proxy.on("proxyRes", (proxyRes, req, res) => {
    console.log(
      "Received Response from the Target:",
      proxyRes.statusCode,
      req.url,
    )
  })
}

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-onboarding",
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@chromatic-com/storybook",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  async viteFinal(config) {
    if (config.server) {
      config.logLevel = "info"
      config.server.proxy = {
        "/easyeda-models": {
          target: "https://modules.easyeda.com/3dmodel/",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/easyeda-models/, ""),
          configure: (proxy, _options) => {
            addProxyLogging(proxy)
          },
        },
        "/easyeda": {
          target: "https://modelcdn.tscircuit.com",
          changeOrigin: true,
          rewrite: (path) => {
            // Extract the filename from the path
            const filename = path.split("/").pop()
            // Construct the new path
            return `/easyeda_models/download?pn=${filename}`
          },
          configure: (proxy, options) => {
            addProxyLogging(proxy)
          },
        },
      }
    }
    return config
  },
  logLevel: "debug",
}
export default config

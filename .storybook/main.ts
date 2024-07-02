import type { StorybookConfig } from "@storybook/react-vite"

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
      config.server.proxy = {
        "/easyeda-models": {
          target: "https://modules.easyeda.com/3dmodel/",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/easyeda-models/, ""),
        },
      }
    }
    return config
  },
}
export default config

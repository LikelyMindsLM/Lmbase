import { Config } from '@stencil/core';
import { sass } from "@stencil/sass";

/**
 * 
 * https://stenciljs.com/docs/config
 */

export const config: Config = {
  plugins: [
    sass({
      injectGlobalPaths: ["src/global/variables.scss"]
    })
  ],
  outputTargets: [{
    type: 'www',
    serviceWorker: null
  }],
  globalScript: "src/global/app.ts",
  globalStyle: "src/global/app.scss",
  taskQueue: 'async'
};
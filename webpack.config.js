import path from "path";

export default {
  entry: "./background.mjs", // Change if your file is background.mjs
  output: {
    path: path.resolve("./"),
    filename: "background.bundle.mjs", // Webpack will generate this file
  },
  mode: "production",
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: [".js", ".mjs"],
  },
};

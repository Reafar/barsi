var path = require("path");
var webpack = require("webpack");

module.exports = {
    devtool: 'source-map',
    target: "web",
    entry: {
        buildsconfigurationwidget: "./src/BuildsConfiguration.ts",
        buildswidget: "./src/Builds.ts",

        releasesconfigurationwidget: "./src/ReleasesConfiguration.ts",
        releaseswidget: "./src/Releases.ts",
    },
    output: {
        filename: "[name].js",
        libraryTarget: "amd",
        devtoolModuleFilenameTemplate: "webpack:///[absolute-resource-path]",

    },
    externals: [
        /^VSS\/.*/, /^TFS\/.*/, /^q$/, /^ReleaseManagement\/.*/,
    ],
    resolve: {
        extensions: ["*", ".webpack.js", ".web.js", ".ts", ".tsx", ".js"],
        modules: [path.resolve("./src"), "node_modules"],
    },
    module: {
        rules: [
            {
                enforce: "pre",
                loader: "tslint-loader",
                options: {
                    emitErrors: true,
                    failOnHint: true,
                },
                test: /\.tsx?$/,
            },
            {
                loader: "ts-loader",
                test: /\.tsx?$/,
            },
        ],
    },
};

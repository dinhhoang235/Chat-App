const { withProjectBuildGradle } = require("@expo/config-plugins");

const ndkVersion = "28.2.13676358";

module.exports = function withNdkVersion(config) {
  return withProjectBuildGradle(config, (projectConfig) => {
    const { contents } = projectConfig.modResults;

    if (contents.includes(`ndkVersion = '${ndkVersion}'`)) {
      return projectConfig;
    }

    if (contents.includes("ext {\n  ndkVersion = '")) {
      projectConfig.modResults.contents = contents.replace(
        /ext \{\n  ndkVersion = '.*?'\n\}/,
        `ext {\n  ndkVersion = '${ndkVersion}'\n}`
      );
      return projectConfig;
    }

    projectConfig.modResults.contents = contents.replace(
      /\n\nallprojects \{/,
      `\n\next {\n  ndkVersion = '${ndkVersion}'\n}\n\nallprojects {`
    );

    return projectConfig;
  });
};
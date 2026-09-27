export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "domain",
        "application",
        "adapter-aa-http",
        "adapter-cache",
        "adapter-cli",
        "cli",
        "tsconfig",
        "repo",
        "refs",
        "scripts",
        "deps",
        "release",
      ],
    ],
  },
}

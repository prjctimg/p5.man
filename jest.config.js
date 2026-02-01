{
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": ["<rootDir>/tests"],
  "testMatch": [
    "**/__tests__/**/*.js",
    "**/?(*.)+(spec|test).[jt]s?(x)"
  ],
  "collectCoverage": true,
  "coverageDirectory": "coverage",
  "collectCoverageFrom": [
    "src/**/*.js"
  ],
  "coverageReporters": [
    "text",
    "lcov",
    "html"
  ],
  "setupFilesAfterEnv": [
    "<rootDir>/tests/setup.js"
  ],
  "testTimeout": 30000,
  "verbose": true,
  "transformIgnorePatterns": [
    "node_modules/(?!(.*)"
  ]
}
import { Octokit } from '@octokit/rest';

/**
 * GitHub API client for repository operations
 */
export class GitHubAPIClient {
  constructor(token) {
    this.octokit = new Octokit({
      auth: token,
      userAgent: 'p5-jsdoc-to-vimdoc/1.0.0'
    });
  }

  /**
   * Get latest release information for a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Object>} Release information
   */
  async getLatestRelease(owner, repo) {
    try {
      const { data } = await this.octokit.rest.repos.getLatestRelease({
        owner,
        repo
      });
      
      return {
        success: true,
        release: data
      };
    } catch (error) {
      if (error.status === 404) {
        return {
          success: false,
          error: 'No releases found',
          notFound: true
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List releases for a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} limit - Maximum number of releases to fetch
   * @returns {Promise<Array>} Array of releases
   */
  async listReleases(owner, repo, limit = 10) {
    try {
      const { data } = await this.octokit.rest.repos.listReleases({
        owner,
        repo,
        per_page: limit
      });
      
      return {
        success: true,
        releases: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get repository content
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path
   * @param {string} ref - Git reference (branch, tag, commit)
   * @returns {Promise<Object>} File content
   */
  async getFileContent(owner, repo, path, ref = 'main') {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref
      });
      
      if (data.type === 'file') {
        return {
          success: true,
          content: Buffer.from(data.content, 'base64').toString('utf8'),
          sha: data.sha
        };
      } else {
        return {
          success: false,
          error: 'Path is not a file',
          type: data.type
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create or update a file in a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path
   * @param {string} content - File content
   * @param {string} message - Commit message
   * @param {string} branch - Target branch
   * @param {string} sha - File SHA for updates (optional)
   * @returns {Promise<Object>} Operation result
   */
  async createOrUpdateFile(owner, repo, path, content, message, branch = 'main', sha = null) {
    try {
      const params = {
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch
      };
      
      if (sha) {
        params.sha = sha;
      }
      
      const { data } = await this.octokit.rest.repos.createOrUpdateFileContents(params);
      
      return {
        success: true,
        commit: data.commit
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.status
      };
    }
  }

  /**
   * Delete a file from a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path
   * @param {string} message - Commit message
   * @param {string} branch - Target branch
   * @param {string} sha - File SHA
   * @returns {Promise<Object>} Operation result
   */
  async deleteFile(owner, repo, path, message, branch = 'main', sha) {
    try {
      const { data } = await this.octokit.rest.repos.deleteFile({
        owner,
        repo,
        path,
        message,
        sha,
        branch
      });
      
      return {
        success: true,
        commit: data.commit
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a new branch
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} branch - New branch name
   * @param {string} fromBranch - Source branch
   * @returns {Promise<Object>} Operation result
   */
  async createBranch(owner, repo, branch, fromBranch = 'main') {
    try {
      // First get the reference for the source branch
      const { data: ref } = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${fromBranch}`
      });
      
      // Create new branch
      const { data } = await this.octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha: ref.object.sha
      });
      
      return {
        success: true,
        ref: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a pull request
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} title - PR title
   * @param {string} body - PR description
   * @param {string} head - Head branch
   * @param {string} base - Base branch
   * @returns {Promise<Object>} PR information
   */
  async createPullRequest(owner, repo, title, body, head, base = 'main') {
    try {
      const { data } = await this.octokit.rest.pulls.create({
        owner,
        repo,
        title,
        body,
        head,
        base
      });
      
      return {
        success: true,
        pullRequest: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get repository information
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Object>} Repository information
   */
  async getRepository(owner, repo) {
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner,
        repo
      });
      
      return {
        success: true,
        repository: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if repository exists
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<boolean>} True if repository exists
   */
  async repositoryExists(owner, repo) {
    const result = await this.getRepository(owner, repo);
    return result.success;
  }

  /**
   * Get rate limit information
   * @returns {Promise<Object>} Rate limit status
   */
  async getRateLimit() {
    try {
      const { data } = await this.octokit.rest.rateLimit.get();
      return {
        success: true,
        rateLimit: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List workflows for a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Array>} Array of workflows
   */
  async listWorkflows(owner, repo) {
    try {
      const { data } = await this.octokit.rest.actions.listWorkflows({
        owner,
        repo
      });
      
      return {
        success: true,
        workflows: data.workflows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Trigger a workflow run
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} workflowId - Workflow ID
   * @param {Object} inputs - Workflow inputs
   * @returns {Promise<Object>} Workflow run information
   */
  async triggerWorkflow(owner, repo, workflowId, inputs = {}) {
    try {
      const { data } = await this.octokit.rest.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: workflowId,
        ref: 'main',
        inputs
      });
      
      return {
        success: true,
        workflowRun: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
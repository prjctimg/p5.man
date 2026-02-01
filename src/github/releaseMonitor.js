import { GitHubAPIClient } from './apiClient.js';

/**
 * Monitors p5.js releases and triggers documentation generation
 */
export class ReleaseMonitor {
  constructor(githubToken, p5Repo = 'processing/p5.js') {
    this.github = new GitHubAPIClient(githubToken);
    this.p5Repo = p5Repo;
    this.lastCheckedRelease = null;
    this.pollingInterval = null;
  }

  /**
   * Start monitoring for new releases
   * @param {Function} onNewRelease - Callback for new releases
   * @param {number} intervalMs - Polling interval in milliseconds
   */
  startMonitoring(onNewRelease, intervalMs = 60000) {
    console.log(`🔍 Starting release monitoring for ${this.p5Repo}`);
    
    // Check immediately on start
    this.checkForNewRelease(onNewRelease);
    
    // Set up periodic checking
    this.pollingInterval = setInterval(() => {
      this.checkForNewRelease(onNewRelease);
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('⏹️ Release monitoring stopped');
    }
  }

  /**
   * Check for new releases
   * @param {Function} onNewRelease - Callback for new releases
   */
  async checkForNewRelease(onNewRelease) {
    try {
      const [owner, repo] = this.p5Repo.split('/');
      const result = await this.github.getLatestRelease(owner, repo);
      
      if (result.success) {
        const latestRelease = result.release;
        
        // Check if this is a new release
        if (!this.lastCheckedRelease || 
            latestRelease.tag_name !== this.lastCheckedRelease.tag_name ||
            new Date(latestRelease.published_at) > new Date(this.lastCheckedRelease.published_at)) {
          
          console.log(`🎉 New release detected: ${latestRelease.tag_name}`);
          this.lastCheckedRelease = latestRelease;
          
          // Trigger callback
          if (onNewRelease) {
            onNewRelease(latestRelease);
          }
        }
      } else if (result.notFound) {
        console.log('📭 No releases found for p5.js repository');
      } else {
        console.error('❌ Error checking for releases:', result.error);
      }
    } catch (error) {
      console.error('❌ Error checking for new releases:', error);
    }
  }

  /**
   * Get all releases since a specific date
   * @param {Date} since - Date to check from
   * @param {number} limit - Maximum number of releases
   * @returns {Promise<Array>} Array of releases
   */
  async getReleasesSince(since, limit = 50) {
    try {
      const [owner, repo] = this.p5Repo.split('/');
      const result = await this.github.listReleases(owner, repo, limit);
      
      if (result.success) {
        const sinceDate = new Date(since);
        const filteredReleases = result.releases.filter(release => 
          new Date(release.published_at) > sinceDate
        );
        
        return {
          success: true,
          releases: filteredReleases
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get release information by tag
   * @param {string} tag - Release tag
   * @returns {Promise<Object>} Release information
   */
  async getReleaseByTag(tag) {
    try {
      const [owner, repo] = this.p5Repo.split('/');
      const { data } = await this.octokit.rest.repos.getReleaseByTag({
        owner,
        repo,
        tag
      });
      
      return {
        success: true,
        release: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if a release is newer than current version
   * @param {Object} release - Release object
   * @returns {boolean} True if release is newer
   */
  isNewerRelease(release) {
    if (!this.lastCheckedRelease) {
      return true;
    }
    
    const currentDate = new Date(this.lastCheckedRelease.published_at);
    const releaseDate = new Date(release.published_at);
    
    return releaseDate > currentDate;
  }

  /**
   * Parse version from release tag
   * @param {string} tag - Release tag
   * @returns {Object} Parsed version
   */
  parseVersion(tag) {
    // Remove 'v' prefix if present
    const cleanTag = tag.startsWith('v') ? tag.slice(1) : tag;
    
    // Split version components
    const parts = cleanTag.split('.');
    const major = parseInt(parts[0]) || 0;
    const minor = parseInt(parts[1]) || 0;
    const patch = parseInt(parts[2]) || 0;
    
    return {
      raw: cleanTag,
      major,
      minor,
      patch,
      semver: `${major}.${minor}.${patch}`
    };
  }

  /**
   * Compare two version strings
   * @param {string} version1 - First version
   * @param {string} version2 - Second version
   * @returns {number} -1, 0, or 1
   */
  compareVersions(version1, version2) {
    const v1 = this.parseVersion(version1);
    const v2 = this.parseVersion(version2);
    
    if (v1.major !== v2.major) {
      return v1.major - v2.major;
    }
    if (v1.minor !== v2.minor) {
      return v1.minor - v2.minor;
    }
    return v1.patch - v2.patch;
  }

  /**
   * Get monitoring status
   * @returns {Object} Current status
   */
  getMonitoringStatus() {
    return {
      isMonitoring: this.pollingInterval !== null,
      repository: this.p5Repo,
      lastCheckedRelease: this.lastCheckedRelease
    };
  }

  /**
   * Setup webhook simulation (for testing)
   * @param {Object} payload - Webhook payload
   * @param {Function} onNewRelease - Callback for new releases
   */
  simulateReleaseWebhook(payload, onNewRelease) {
    if (payload.action === 'published' && payload.release) {
      console.log('🎉 Simulated webhook: New release published');
      this.lastCheckedRelease = payload.release;
      
      if (onNewRelease) {
        onNewRelease(payload.release);
      }
    }
  }
}
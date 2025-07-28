#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

class StandaloneValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.success = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async validateFile(filePath) {
    this.log(`Validating standalone HTML file: ${filePath}`);
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileSize = content.length;
      
      this.log(`File size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`, 'info');
      
      // Check if file exists and is readable
      if (content.length === 0) {
        this.errors.push('File is empty');
        return false;
      }
      
      this.success.push('File is readable and not empty');
      
      // Check HTML structure
      if (!content.includes('<!DOCTYPE html>')) {
        this.errors.push('Missing DOCTYPE declaration');
      } else {
        this.success.push('Valid DOCTYPE found');
      }
      
      if (!content.includes('<html')) {
        this.errors.push('Missing HTML tag');
      } else {
        this.success.push('HTML tag found');
      }
      
      if (!content.includes('<head>')) {
        this.errors.push('Missing head section');
      } else {
        this.success.push('Head section found');
      }
      
      if (!content.includes('<body>')) {
        this.errors.push('Missing body section');
      } else {
        this.success.push('Body section found');
      }
      
      // Check for external dependencies
      const externalScripts = content.match(/<script[^>]*src="[^"]*"[^>]*>/g);
      if (externalScripts && externalScripts.length > 0) {
        this.warnings.push(`Found ${externalScripts.length} external script tags`);
        externalScripts.forEach(script => {
          this.warnings.push(`  External script: ${script}`);
        });
      } else {
        this.success.push('No external script dependencies found');
      }
      
      const externalStyles = content.match(/<link[^>]*href="[^"]*"[^>]*>/g);
      if (externalStyles && externalStyles.length > 0) {
        this.warnings.push(`Found ${externalStyles.length} external style links`);
        externalStyles.forEach(style => {
          this.warnings.push(`  External style: ${style}`);
        });
      } else {
        this.success.push('No external style dependencies found');
      }
      
      // Check for Next.js specific content
      if (content.includes('__next')) {
        this.success.push('Next.js content detected');
      } else {
        this.warnings.push('No Next.js content detected');
      }
      
      // Check for React content
      if (content.includes('React') || content.includes('react')) {
        this.success.push('React content detected');
      } else {
        this.warnings.push('No React content detected');
      }
      
      // Check for inlined assets
      const dataUrls = content.match(/data:[^"'\s]+/g);
      if (dataUrls && dataUrls.length > 0) {
        this.success.push(`Found ${dataUrls.length} inlined assets (data URLs)`);
      } else {
        this.warnings.push('No inlined assets found');
      }
      
      // Check for JavaScript content
      const scriptTags = content.match(/<script[^>]*>[\s\S]*?<\/script>/g);
      if (scriptTags && scriptTags.length > 0) {
        this.success.push(`Found ${scriptTags.length} script tags with content`);
      } else {
        this.warnings.push('No script tags with content found');
      }
      
      // Check for CSS content
      const styleTags = content.match(/<style[^>]*>[\s\S]*?<\/style>/g);
      if (styleTags && styleTags.length > 0) {
        this.success.push(`Found ${styleTags.length} style tags with content`);
      } else {
        this.warnings.push('No style tags with content found');
      }
      
      // Check for common error patterns
      if (content.includes('ERR_FILE_NOT_FOUND')) {
        this.errors.push('Contains file not found error patterns');
      }
      
      if (content.includes('ERR_FAILED')) {
        this.errors.push('Contains failed request error patterns');
      }
      
      if (content.includes('ChunkLoadError')) {
        this.errors.push('Contains chunk loading error patterns');
      }
      
      // Check for CORS issues
      if (content.includes('CORS policy')) {
        this.errors.push('Contains CORS policy error patterns');
      }
      
      return this.errors.length === 0;
      
    } catch (error) {
      this.errors.push(`Failed to read file: ${error.message}`);
      return false;
    }
  }
  
  printReport() {
    console.log('\n📊 VALIDATION REPORT');
    console.log('='.repeat(50));
    
    if (this.success.length > 0) {
      console.log('\n✅ SUCCESS CHECKS:');
      this.success.forEach(check => {
        console.log(`  ✓ ${check}`);
      });
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.warnings.forEach(warning => {
        console.log(`  ⚠ ${warning}`);
      });
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.errors.forEach(error => {
        console.log(`  ✗ ${error}`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (this.errors.length === 0) {
      console.log('🎉 VALIDATION PASSED - File appears to be properly standalone!');
      return true;
    } else {
      console.log('❌ VALIDATION FAILED - Issues found that need to be addressed.');
      return false;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0] || './standalone.html';
  
  console.log('🔍 Standalone HTML Validator');
  console.log('='.repeat(50));
  
  const validator = new StandaloneValidator();
  const isValid = await validator.validateFile(filePath);
  const passed = validator.printReport();
  
  process.exit(passed ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { StandaloneValidator }; 
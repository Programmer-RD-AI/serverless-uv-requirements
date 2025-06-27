import UvRequirementsPlugin from '../src/index';
import { UvUtils } from '../src/utils';
import { ServerlessInstance, PluginOptions } from '../src/types';

// Mock child_process and fs
jest.mock('child_process');
jest.mock('fs');

const mockServerless: ServerlessInstance = {
  service: {
    provider: {
      name: 'aws',
      runtime: 'python3.11'
    },
    custom: {
      uv: {
        mode: 'compile',
        source: 'pyproject.toml',
        output: 'requirements.txt'
      }
    }
  },
  cli: {
    log: jest.fn(),
    warn: jest.fn()
  },
  utils: {
    writeFileSync: jest.fn(),
    fileExistsSync: jest.fn().mockReturnValue(true)
  }
};

const mockOptions: PluginOptions = {
  stage: 'dev',
  region: 'us-east-1'
};

describe('UvRequirementsPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock uv availability
    jest.spyOn(UvUtils, 'isUvAvailable').mockReturnValue(true);
    jest.spyOn(UvUtils, 'getUvVersion').mockReturnValue('uv 0.1.0');
    jest.spyOn(UvUtils, 'validateConfig').mockImplementation(() => {});
    jest.spyOn(UvUtils, 'executeCommand').mockReturnValue({
      status: 0,
      stdout: 'success',
      stderr: '',
      pid: 1234,
      output: ['', 'success', ''],
      signal: null
    });
  });

  test('should initialize plugin with default config', () => {
    const plugin = new UvRequirementsPlugin(mockServerless, mockOptions);
    expect(plugin).toBeDefined();
    expect(plugin.hooks).toHaveProperty('before:package:createDeploymentArtifacts');
  });

  test('should validate Python runtime', () => {
    const nonPythonServerless = {
      ...mockServerless,
      service: {
        ...mockServerless.service,
        provider: {
          name: 'aws',
          runtime: 'nodejs18.x'
        }
      }
    };

    new UvRequirementsPlugin(nonPythonServerless, mockOptions);
    expect(mockServerless.cli.warn).toHaveBeenCalledWith(
      expect.stringContaining("Runtime 'nodejs18.x' is not Python")
    );
  });

  test('should handle missing uv gracefully when skipIfMissing is true', async () => {
    jest.spyOn(UvUtils, 'isUvAvailable').mockReturnValue(false);
    
    const configWithSkip = {
      ...mockServerless,
      service: {
        ...mockServerless.service,
        custom: {
          uv: {
            skipIfMissing: true
          }
        }
      }
    };

    const plugin = new UvRequirementsPlugin(configWithSkip, mockOptions);
    await plugin.generateRequirements();
    
    expect(mockServerless.cli.warn).toHaveBeenCalledWith(
      expect.stringContaining('uv is not available')
    );
  });

  test('should execute UV command successfully', async () => {
    const plugin = new UvRequirementsPlugin(mockServerless, mockOptions);
    await plugin.generateRequirements();
    
    expect(UvUtils.executeCommand).toHaveBeenCalled();
    expect(mockServerless.cli.log).toHaveBeenCalledWith(
      expect.stringContaining('Requirements compiled')
    );
  });
});

describe('UvUtils', () => {
  test('should build correct compile command', () => {
    const config = UvUtils.getDefaultConfig();
    config.mode = 'compile';
    config.source = 'pyproject.toml';
    config.output = 'requirements.txt';
    config.pythonVersion = '3.11';
    
    const command = UvUtils.buildCommand(config);
    
    expect(command).toEqual([
      'uv', 'pip', 'compile', 'pyproject.toml', 
      '-o', 'requirements.txt', 
      '--python-version', '3.11'
    ]);
  });

  test('should build correct freeze command', () => {
    const config = UvUtils.getDefaultConfig();
    config.mode = 'freeze';
    
    const command = UvUtils.buildCommand(config);
    
    expect(command).toEqual(['uv', 'pip', 'freeze']);
  });

  test('should merge configs correctly', () => {
    const userConfig = {
      mode: 'freeze' as const,
      verbose: true,
      extraIndexUrl: ['https://test.pypi.org/simple/']
    };
    
    const merged = UvUtils.mergeConfig(userConfig);
    
    expect(merged.mode).toBe('freeze');
    expect(merged.verbose).toBe(true);
    expect(merged.extraIndexUrl).toEqual(['https://test.pypi.org/simple/']);
    expect(merged.source).toBe('pyproject.toml'); // default
  });
});

/**
 * MartyController
 * Bridges WebSocket commands to the Marty 3D model animations and movements
 */

import type Marty from './Marty';
import type { RobotCommand } from '../../services/WebSocketService';

export class MartyController {
  private marty: Marty;
  private commandQueue: RobotCommand[] = [];
  private isProcessing = false;

  constructor(marty: Marty) {
    this.marty = marty;
  }

  /**
   * Process a command received from the WebSocket
   */
  async processCommand(
    command: RobotCommand,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      switch (command.action) {
        case 'walk':
          return await this.handleWalk(command.params);

        case 'turn':
          return await this.handleTurn(command.params);

        case 'wave':
          return await this.handleWave();

        case 'stop':
          return this.handleStop();

        case 'execute_python':
          return await this.handleExecutePython(command.params);

        default:
          console.warn('⚠️ Unknown command:', command.action);
          return {
            success: false,
            message: `Unknown command: ${command.action}`,
          };
      }
    } catch (error) {
      console.error('❌ Error processing command:', error);
      return { success: false, message: String(error) };
    }
  }

  /**
   * Handle walk command
   */
  private async handleWalk(
    params?: Record<string, unknown>,
  ): Promise<{ success: boolean; message?: string }> {
    const steps = (params?.steps as number) || 2;

    if (this.marty.animation?.play) {
      // One animation cycle = 2 steps
      const cycles = Math.floor(steps);

      // Get actual animation duration
      const animationDuration = this.marty.getAnimationDuration('walking');

      if (cycles > 0) {
        // Play full cycles - disable auto-stop for all but the last
        for (let i = 0; i < cycles; i++) {
          const isLastCycle = i === cycles - 1;
          // Disable auto-stop for intermediate cycles
          this.marty.animation.play('walking', { autoStop: isLastCycle });
          // Wait for animation to complete using actual duration
          await new Promise((resolve) =>
            setTimeout(resolve, animationDuration),
          );
        }
      }

      return { success: true, message: `Walking ${steps} steps` };
    }

    return { success: false, message: 'Animation system not ready' };
  }

  /**
   * Handle wave command
   */
  private async handleWave(): Promise<{ success: boolean; message?: string }> {
    if (this.marty.animation?.play) {
      this.marty.animation.play('waving');

      // Get actual animation duration
      const animationDuration = this.marty.getAnimationDuration('waving');

      // Wait for animation to complete
      await new Promise((resolve) => setTimeout(resolve, animationDuration));

      return { success: true, message: 'Waving' };
    }

    return { success: false, message: 'Animation system not ready' };
  }

  /**
   * Handle turn command
   */
  private async handleTurn(
    params?: Record<string, unknown>,
  ): Promise<{ success: boolean; message?: string }> {
    const angle = (params?.angle as number) || 30; // Default 30 degrees

    if (this.marty.animation?.play && this.marty.animation.actions?.turnRight) {
      // Update the turn base angle
      if (this.marty.animation.settings) {
        const THREE = await import('three');
        this.marty.animation.settings.turnBaseAngle =
          THREE.MathUtils.degToRad(angle);
      }

      this.marty.animation.play('turnRight');

      // Get actual animation duration
      const animationDuration = this.marty.getAnimationDuration('turnRight');

      // Wait for animation to complete
      await new Promise((resolve) => setTimeout(resolve, animationDuration));

      return { success: true, message: `Turning ${angle} degrees` };
    }

    return {
      success: false,
      message: 'Turn animation not available or not ready',
    };
  }

  /**
   * Handle stop command
   */
  private handleStop(): { success: boolean; message?: string } {
    if (this.marty.animation?.stop) {
      this.marty.animation.stop();
      this.marty.movement.enabled = false;
      return { success: true, message: 'Stopped' };
    }

    return { success: false, message: 'Animation system not ready' };
  }

  /**
   * Handle Python code execution
   * Parse Python code and convert to commands
   */
  private async handleExecutePython(
    params?: Record<string, unknown>,
  ): Promise<{ success: boolean; message?: string }> {
    const code = (params?.code as string) || '';

    // Simple parser for basic Marty commands
    const lines = code.split('\n');
    const commands: RobotCommand[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Parse marty.walk()
      if (trimmed.includes('marty.walk(')) {
        const match = trimmed.match(/marty\.walk\((\d+)\)/);
        const steps = match ? parseInt(match[1]) : 2;
        commands.push({ action: 'walk', params: { steps } });
      }

      // Parse marty.turn()
      else if (trimmed.includes('marty.turn(')) {
        const match = trimmed.match(/marty\.turn\((-?\d+)\)/);
        const angle = match ? parseInt(match[1]) : 30;
        commands.push({ action: 'turn', params: { angle } });
      }

      // Parse marty.wave()
      else if (trimmed.includes('marty.wave(')) {
        commands.push({ action: 'wave' });
      }

      // Parse marty.stop()
      else if (trimmed.includes('marty.stop(')) {
        commands.push({ action: 'stop' });
      }
    }

    if (commands.length === 0) {
      return { success: true, message: 'No Marty commands found in code' };
    }

    // Queue commands for sequential execution
    for (const cmd of commands) {
      this.enqueueCommand(cmd);
    }

    return { success: true, message: `Queued ${commands.length} command(s)` };
  }

  /**
   * Add a command to the queue
   */
  enqueueCommand(command: RobotCommand) {
    this.commandQueue.push(command);
    this.processQueue();
  }

  /**
   * Process the command queue
   */
  private async processQueue() {
    if (this.isProcessing || this.commandQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.commandQueue.length > 0) {
      const command = this.commandQueue.shift();
      if (command) {
        await this.processCommand(command);
        // Small delay between commands to prevent overlap
        if (this.commandQueue.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    this.isProcessing = false;
  }
}

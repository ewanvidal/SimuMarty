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

        case 'turnLeft':
          return await this.handleTurnLeft(command.params);

        case 'wave':
          return await this.handleWave();

        case 'kick':
          return await this.handleKick();

        case 'dance':
          return await this.handleDance();

        case 'slideLeft':
          return await this.handleSlideLeft();

        case 'slideRight':
          return await this.handleSlideRight();

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
      const getReadyDuration = this.marty.getAnimationDuration('getReady');

      if (cycles > 0) {
        // Play full cycles
        for (let i = 0; i < cycles; i++) {
          const isLastCycle = i === cycles - 1;
          // Always auto-stop to trigger getReady if steps > 2
          this.marty.animation.play('walking', { autoStop: true });
          // Wait for animation to complete using actual duration
          await new Promise((resolve) =>
            setTimeout(resolve, animationDuration),
          );
          
          // Add getReady between cycles if steps > 2
          if (steps >= 2 || isLastCycle) {
            await new Promise((resolve) => setTimeout(resolve, getReadyDuration));
          }
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
      const getReadyDuration = this.marty.getAnimationDuration('getReady');

      // Wait for animation to complete
      await new Promise((resolve) => setTimeout(resolve, animationDuration));
      
      // Wait for getReady transition
      await new Promise((resolve) => setTimeout(resolve, getReadyDuration));

      return { success: true, message: 'Waving' };
    }

    return { success: false, message: 'Animation system not ready' };
  }

  /**
   * Handle turn command (turn right)
   */
  private async handleTurn(
    params?: Record<string, unknown>,
  ): Promise<{ success: boolean; message?: string }> {
    const angle = (params?.angle as number) || 30; // Default 30 degrees

    if (this.marty.animation?.play && this.marty.animation.actions?.turnRight) {
      // Calculate how many times to replay the animation
      const baseAngle = 30; // Base angle per animation
      const repetitions = Math.ceil(angle / baseAngle);
      const anglePerRepetition = angle / repetitions;

      // Update the turn base angle
      if (this.marty.animation.settings) {
        const THREE = await import('three');
        this.marty.animation.settings.turnBaseAngle =
          THREE.MathUtils.degToRad(anglePerRepetition);
      }

      // Play animation multiple times if needed
      for (let i = 0; i < repetitions; i++) {
        this.marty.animation.play('turnRight', { autoStop: true });

        // Get actual animation duration based on the angle
        const animationDuration = this.marty.getAnimationDuration('turnRight', { angle: anglePerRepetition });
        const getReadyDuration = this.marty.getAnimationDuration('getReady');

        // Wait for animation to complete
        await new Promise((resolve) => setTimeout(resolve, animationDuration));
        
        // Wait for getReady between each repetition
        await new Promise((resolve) => setTimeout(resolve, getReadyDuration));
      }

      return { success: true, message: `Turning right ${angle} degrees` };
    }

    return {
      success: false,
      message: 'Turn right animation not available or not ready',
    };
  }

  /**
   * Handle turn left command
   */
  private async handleTurnLeft(
    params?: Record<string, unknown>,
  ): Promise<{ success: boolean; message?: string }> {
    const angle = (params?.angle as number) || 30; // Default 30 degrees

    if (this.marty.animation?.play && this.marty.animation.actions?.turnLeft) {
      // Calculate how many times to replay the animation
      const baseAngle = 30; // Base angle per animation
      const repetitions = Math.ceil(angle / baseAngle);
      const anglePerRepetition = angle / repetitions;

      // Update the turn base angle
      if (this.marty.animation.settings) {
        const THREE = await import('three');
        this.marty.animation.settings.turnBaseAngle =
          THREE.MathUtils.degToRad(anglePerRepetition);
      }

      // Play animation multiple times if needed
      for (let i = 0; i < repetitions; i++) {
        this.marty.animation.play('turnLeft', { autoStop: true });

        // Get actual animation duration based on the angle
        const animationDuration = this.marty.getAnimationDuration('turnLeft', { angle: anglePerRepetition });
        const getReadyDuration = this.marty.getAnimationDuration('getReady');

        // Wait for animation to complete
        await new Promise((resolve) => setTimeout(resolve, animationDuration));
        
        // Wait for getReady between each repetition
        await new Promise((resolve) => setTimeout(resolve, getReadyDuration));
      }

      return { success: true, message: `Turning left ${angle} degrees` };
    }

    return {
      success: false,
      message: 'Turn left animation not available or not ready',
    };
  }

  /**
   * Handle kick command
   */
  private async handleKick(): Promise<{ success: boolean; message?: string }> {
    if (this.marty.animation?.play && this.marty.animation.actions?.kick) {
      this.marty.animation.play('kick');

      // Get actual animation duration
      const animationDuration = this.marty.getAnimationDuration('kick');
      const getReadyDuration = this.marty.getAnimationDuration('getReady');

      // Wait for animation to complete
      await new Promise((resolve) => setTimeout(resolve, animationDuration));
      
      // Wait for getReady transition
      await new Promise((resolve) => setTimeout(resolve, getReadyDuration));

      return { success: true, message: 'Kicking' };
    }

    return { success: false, message: 'Kick animation not available' };
  }

  /**
   * Handle dance command
   */
  private async handleDance(): Promise<{ success: boolean; message?: string }> {
    if (this.marty.animation?.play && this.marty.animation.actions?.dance) {
      this.marty.animation.play('dance');

      // Get actual animation duration
      const animationDuration = this.marty.getAnimationDuration('dance');
      const getReadyDuration = this.marty.getAnimationDuration('getReady');

      // Wait for animation to complete
      await new Promise((resolve) => setTimeout(resolve, animationDuration));
      
      // Wait for getReady transition
      await new Promise((resolve) => setTimeout(resolve, getReadyDuration));

      return { success: true, message: 'Dancing' };
    }

    return { success: false, message: 'Dance animation not available' };
  }

  /**
   * Handle slide left command
   */
  private async handleSlideLeft(): Promise<{ success: boolean; message?: string }> {
    if (this.marty.animation?.play && this.marty.animation.actions?.slideLeft) {
      this.marty.animation.play('slideLeft');

      // Get actual animation duration
      const animationDuration = this.marty.getAnimationDuration('slideLeft');
      const getReadyDuration = this.marty.getAnimationDuration('getReady');

      // Wait for animation to complete
      await new Promise((resolve) => setTimeout(resolve, animationDuration));
      
      // Wait for getReady transition
      await new Promise((resolve) => setTimeout(resolve, getReadyDuration));

      return { success: true, message: 'Sliding left' };
    }

    return { success: false, message: 'Slide left animation not available' };
  }

  /**
   * Handle slide right command
   */
  private async handleSlideRight(): Promise<{ success: boolean; message?: string }> {
    if (this.marty.animation?.play && this.marty.animation.actions?.slideRight) {
      this.marty.animation.play('slideRight');

      // Get actual animation duration
      const animationDuration = this.marty.getAnimationDuration('slideRight');
      const getReadyDuration = this.marty.getAnimationDuration('getReady');

      // Wait for animation to complete
      await new Promise((resolve) => setTimeout(resolve, animationDuration));
      
      // Wait for getReady transition
      await new Promise((resolve) => setTimeout(resolve, getReadyDuration));

      return { success: true, message: 'Sliding right' };
    }

    return { success: false, message: 'Slide right animation not available' };
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

      // Parse marty.turnRight()
      else if (trimmed.includes('marty.turnRight(')) {
        const match = trimmed.match(/marty\.turnRight\((\-?\d+)\)/);
        const angle = match ? parseInt(match[1]) : 30;
        commands.push({ action: 'turn', params: { angle } });
      }

      // Parse marty.turnLeft()
      else if (trimmed.includes('marty.turnLeft(')) {
        const match = trimmed.match(/marty\.turnLeft\((\-?\d+)\)/);
        const angle = match ? parseInt(match[1]) : 30;
        commands.push({ action: 'turnLeft', params: { angle } });
      }

      // Parse marty.wave()
      else if (trimmed.includes('marty.wave(')) {
        commands.push({ action: 'wave' });
      }

      // Parse marty.kick()
      else if (trimmed.includes('marty.kick(')) {
        commands.push({ action: 'kick' });
      }

      // Parse marty.dance()
      else if (trimmed.includes('marty.dance(')) {
        commands.push({ action: 'dance' });
      }

      // Parse marty.slideLeft()
      else if (trimmed.includes('marty.slideLeft(')) {
        commands.push({ action: 'slideLeft' });
      }

      // Parse marty.slideRight()
      else if (trimmed.includes('marty.slideRight(')) {
        commands.push({ action: 'slideRight' });
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

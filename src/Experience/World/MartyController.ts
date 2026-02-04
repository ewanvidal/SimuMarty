/**
 * MartyController
 * Bridges WebSocket commands to the Marty 3D model animations and movements
 */

import type Marty from './Marty';
import {
  webSocketService,
  type RobotCommand,
  type WebSocketMessage,
} from '../../services/WebSocketService';

export class MartyController {
  private marty: Marty;
  private commandQueue: RobotCommand[] = [];
  private isProcessing = false;
  private shouldStop = false;

  constructor(marty: Marty) {
    this.marty = marty;
  }

  /**
   * Stop all current and pending commands
   */
  stopExecution(): void {
    this.shouldStop = true;
    this.commandQueue = [];
    this.isProcessing = false;

    // Stop any current animation
    if (this.marty.animation?.stop) {
      this.marty.animation.stop();
    }
  }

  /**
   * Check if execution should stop
   */
  isStopped(): boolean {
    return this.shouldStop;
  }

  /**
   * Wait with stop check - returns true if stopped
   */
  private async waitWithStopCheck(duration: number): Promise<boolean> {
    await this.marty.time.wait(duration);
    return this.shouldStop;
  }

  /**
   * Process a command received from the WebSocket
   */
  async processCommand(
    command: RobotCommand,
  ): Promise<{ success: boolean; message?: string }> {
    // Check if execution was stopped
    if (this.shouldStop) {
      return { success: false, message: 'Execution stopped' };
    }

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

        case 'joint':
        case 'jointControl':
        case 'setJoint':
        case 'setJointAngle':
          return await this.handleJointCommand(command.params);

        case 'stop':
          return this.handleStop();

        case 'execute_python':
          return await this.handleExecutePython(command.params);

        case 'getGroundColor':
          return this.handleGetGroundColor();

        case 'getObstacleDistance':
          return this.handleGetObstacleDistance();

        default:
          return {
            success: false,
            message: `Unknown command: ${command.action}`,
          };
      }
    } catch (error) {
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
          // Check if stopped
          if (this.shouldStop) {
            return { success: false, message: 'Execution stopped' };
          }

          const isLastCycle = i === cycles - 1;
          // Always auto-stop to trigger getReady if steps > 2
          this.marty.animation.play('walking', { autoStop: true });
          // Wait for animation to complete using actual duration
          await this.marty.time.wait(animationDuration);

          // Check if stopped after animation
          if (this.shouldStop) {
            return { success: false, message: 'Execution stopped' };
          }

          // Add getReady between cycles if steps >= 2
          // The value 500ms is an additional buffer to ensure smooth transition
          if (steps >= 2 || isLastCycle) {
            await this.marty.time.wait(getReadyDuration + 500);
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
      if (await this.waitWithStopCheck(animationDuration)) {
        return { success: false, message: 'Execution stopped' };
      }

      // Wait for getReady transition
      if (await this.waitWithStopCheck(getReadyDuration)) {
        return { success: false, message: 'Execution stopped' };
      }

      return { success: true, message: 'Waving' };
    }

    return { success: false, message: 'Animation system not ready' };
  }

  /**
   * Handle turn command (turn right) - Uses procedural animation
   */
  private async handleTurn(
    params?: Record<string, unknown>,
  ): Promise<{ success: boolean; message?: string }> {
    const angle = (params?.angle as number) || 30; // Default 30 degrees

    // Use the new procedural turn system
    const result = await this.marty.turnRight(angle);
    return result;
  }

  /**
   * Handle turn left command - Uses procedural animation
   */
  private async handleTurnLeft(
    params?: Record<string, unknown>,
  ): Promise<{ success: boolean; message?: string }> {
    const angle = (params?.angle as number) || 30; // Default 30 degrees

    // Use the new procedural turn system
    const result = await this.marty.turnLeft(angle);
    return result;
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
      if (await this.waitWithStopCheck(animationDuration)) {
        return { success: false, message: 'Execution stopped' };
      }

      // Wait for getReady transition
      if (await this.waitWithStopCheck(getReadyDuration)) {
        return { success: false, message: 'Execution stopped' };
      }

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
      if (await this.waitWithStopCheck(animationDuration)) {
        return { success: false, message: 'Execution stopped' };
      }

      // Wait for getReady transition
      if (await this.waitWithStopCheck(getReadyDuration)) {
        return { success: false, message: 'Execution stopped' };
      }

      return { success: true, message: 'Dancing' };
    }

    return { success: false, message: 'Dance animation not available' };
  }

  /**
   * Handle slide left command
   */
  private async handleSlideLeft(): Promise<{
    success: boolean;
    message?: string;
  }> {
    if (this.marty.animation?.play && this.marty.animation.actions?.slideLeft) {
      this.marty.animation.play('slideLeft');

      // Get actual animation duration
      const animationDuration = this.marty.getAnimationDuration('slideLeft');
      const getReadyDuration = this.marty.getAnimationDuration('getReady');

      // Wait for animation to complete
      if (await this.waitWithStopCheck(animationDuration)) {
        return { success: false, message: 'Execution stopped' };
      }

      // Wait for getReady transition
      if (await this.waitWithStopCheck(getReadyDuration)) {
        return { success: false, message: 'Execution stopped' };
      }

      return { success: true, message: 'Sliding left' };
    }

    return { success: false, message: 'Slide left animation not available' };
  }

  /**
   * Handle slide right command
   */
  private async handleSlideRight(): Promise<{
    success: boolean;
    message?: string;
  }> {
    if (
      this.marty.animation?.play &&
      this.marty.animation.actions?.slideRight
    ) {
      this.marty.animation.play('slideRight');

      // Get actual animation duration
      const animationDuration = this.marty.getAnimationDuration('slideRight');
      const getReadyDuration = this.marty.getAnimationDuration('getReady');

      // Wait for animation to complete
      if (await this.waitWithStopCheck(animationDuration)) {
        return { success: false, message: 'Execution stopped' };
      }

      // Wait for getReady transition
      if (await this.waitWithStopCheck(getReadyDuration)) {
        return { success: false, message: 'Execution stopped' };
      }

      return { success: true, message: 'Sliding right' };
    }

    return { success: false, message: 'Slide right animation not available' };
  }

  // Handle REST/WebSocket joint control requests and forward them to the model
  private async handleJointCommand(
    params?: Record<string, unknown>,
  ): Promise<{ success: boolean; message?: string }> {
    if (!params) {
      return { success: false, message: 'Missing joint parameters' };
    }

    const jointParam =
      params.jointId ??
      params.joint ??
      params.id ??
      params.name ??
      params.target;
    if (jointParam === undefined || jointParam === null) {
      return { success: false, message: 'jointId parameter is required' };
    }

    const rawAngle =
      params.angle ??
      params.value ??
      params.position ??
      params.pos ??
      params.deg;
    const angle =
      typeof rawAngle === 'string'
        ? Number(rawAngle)
        : (rawAngle as number | undefined);

    if (angle === undefined || Number.isNaN(angle)) {
      return { success: false, message: 'Angle parameter is required' };
    }

    const rawMoveTime = params.moveTime ?? params.duration ?? params.time;
    const moveTime =
      typeof rawMoveTime === 'string'
        ? Number(rawMoveTime)
        : (rawMoveTime as number | undefined);

    return this.marty.setJointAngle(jointParam as number | string, angle, {
      moveTime: moveTime && !Number.isNaN(moveTime) ? moveTime : undefined,
    });
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
        const match = trimmed.match(/marty\.turnRight\((-?\d+)\)/);
        const angle = match ? parseInt(match[1]) : 30;
        commands.push({ action: 'turn', params: { angle } });
      }

      // Parse marty.turnLeft()
      else if (trimmed.includes('marty.turnLeft(')) {
        const match = trimmed.match(/marty\.turnLeft\((-?\d+)\)/);
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
    this.shouldStop = false;

    while (this.commandQueue.length > 0 && !this.shouldStop) {
      const command = this.commandQueue.shift();
      if (command && !this.shouldStop) {
        const result = await this.processCommand(command);

        // Check if we were stopped during command execution
        if (this.shouldStop) break;

        // Send acknowledgement back to server (needed for blocking calls in Python)
        // Skip for sensor commands as they send their own data payloads
        if (
          !['getGroundColor', 'getObstacleDistance'].includes(command.action)
        ) {
          webSocketService.send({
            type: 'commandAck',
            payload: {
              requestId: command.requestId,
              status: result.success ? 'success' : 'error',
              message: result.message,
            },
            timestamp: Date.now(),
          } as WebSocketMessage<unknown>);
        }

        // Small delay between commands to prevent overlap
        if (this.commandQueue.length > 0 && !this.shouldStop) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Handle ground color sensor query
   */
  private handleGetGroundColor(): {
    success: boolean;
    message?: string;
    data?: unknown;
  } {
    const color = this.marty.getGroundColor();

    if (!color) {
      return {
        success: false,
        message: 'Ground color sensor not available',
      };
    }

    // Log to browser console
    console.log(`RGB(${color.r}, ${color.g}, ${color.b})`);

    // Send sensor data back via WebSocket
    webSocketService.send({
      type: 'sensorData',
      payload: {
        sensorType: 'groundColor',
        data: color,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    } as WebSocketMessage<unknown>);

    return {
      success: true,
      message: 'Ground color retrieved',
      data: color,
    };
  }

  /**
   * Handle obstacle distance sensor query
   */
  private handleGetObstacleDistance(): {
    success: boolean;
    message?: string;
    data?: unknown;
  } {
    const distance = this.marty.getObstacleDistance();

    const obstacleData = {
      distance,
      detected: distance !== Infinity,
    };

    // Log to browser console
    if (obstacleData.detected) {
      console.log(distance.toFixed(2));
    } else {
      console.log('Obstacle Distance: Clear (no obstacle detected)');
    }

    // Send sensor data back via WebSocket
    webSocketService.send({
      type: 'sensorData',
      payload: {
        sensorType: 'obstacle',
        data: obstacleData,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    } as WebSocketMessage<unknown>);

    return {
      success: true,
      message: 'Obstacle distance retrieved',
      data: obstacleData,
    };
  }
}

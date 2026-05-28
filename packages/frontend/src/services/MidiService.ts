/**
 * MIDI 服务层
 * 管理 MIDI 设备连接、授权、消息监听
 */

/** MIDI 设备信息 */
export interface MidiDeviceInfo {
  /** 设备 ID */
  id: string;
  /** 设备名称 */
  name: string;
  /** 设备制造商 */
  manufacturer: string;
  /** 设备状态 */
  state: 'connected' | 'disconnected';
}

/** MIDI 音符事件 */
export interface MidiNoteEvent {
  /** 音符号（0-127） */
  note: number;
  /** 力度（0-127） */
  velocity: number;
  /** 通道（0-15） */
  channel: number;
  /** 时间戳 */
  timestamp: number;
}

/** MIDI 事件监听器 */
type MidiEventListener = (event: MidiNoteEvent) => void;

/** 设备变化监听器 */
type DeviceChangeListener = (devices: MidiDeviceInfo[]) => void;

/**
 * MIDI 服务类
 * 单例模式，管理 Web MIDI API 连接和消息分发
 */
class MidiService {
  /** MIDI 访问接口 */
  private midiAccess: MIDIAccess | null = null;
  /** 当前选中的输入设备 */
  private selectedInput: MIDIInput | null = null;
  /** 可用设备列表 */
  private devices: MidiDeviceInfo[] = [];
  /** 音符事件监听器 */
  private noteListeners: Set<MidiEventListener> = new Set();
  /** 设备变化监听器 */
  private deviceListeners: Set<DeviceChangeListener> = new Set();
  /** 是否已初始化 */
  private initialized = false;

  /**
   * 初始化 MIDI 服务
   * 请求 MIDI 访问权限并扫描可用设备
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    // 检查浏览器是否支持 Web MIDI API
    if (!navigator.requestMIDIAccess) {
      console.warn('[MidiService] 浏览器不支持 Web MIDI API');
      return false;
    }

    try {
      // 请求 MIDI 访问权限（不请求 SysEx 权限）
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });

      // 监听设备连接/断开事件
      this.midiAccess.onstatechange = this.handleStateChange.bind(this);

      // 扫描可用设备
      this.scanDevices();

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('[MidiService] 初始化失败:', error);
      return false;
    }
  }

  /**
   * 扫描可用的 MIDI 输入设备
   */
  private scanDevices(): void {
    if (!this.midiAccess) return;

    this.devices = [];

    // 遍历所有输入设备
    this.midiAccess.inputs.forEach((input: MIDIInput) => {
      this.devices.push({
        id: input.id,
        name: input.name || '未知设备',
        manufacturer: input.manufacturer || '未知厂商',
        state: input.state as 'connected' | 'disconnected',
      });
    });

    // 通知设备变化监听器
    this.notifyDeviceListeners();
  }

  /**
   * 处理设备状态变化
   */
  private handleStateChange(event: MIDIConnectionEvent): void {
    if (!event.port) return;
    
    console.log('[MidiService] 设备状态变化:', event.port.name, event.port.state);
    this.scanDevices();

    // 如果当前选中的设备断开，清除选择
    if (this.selectedInput && event.port.id === this.selectedInput.id && event.port.state === 'disconnected') {
      this.selectedInput = null;
    }
  }

  /**
   * 选择 MIDI 输入设备
   * @param deviceId 设备 ID
   */
  selectDevice(deviceId: string): boolean {
    if (!this.midiAccess) return false;

    // 断开当前设备
    if (this.selectedInput) {
      this.selectedInput.onmidimessage = null;
      this.selectedInput = null;
    }

    // 查找并连接新设备
    const input = this.midiAccess.inputs.get(deviceId);
    if (!input) {
      console.warn('[MidiService] 设备不存在:', deviceId);
      return false;
    }

    this.selectedInput = input;
    this.selectedInput.onmidimessage = this.handleMidiMessage.bind(this);

    console.log('[MidiService] 已选择设备:', input.name);
    return true;
  }

  /**
   * 处理 MIDI 消息
   */
  private handleMidiMessage(event: MIDIMessageEvent): void {
    if (!event.data) return;
    
    const [status, note, velocity] = event.data;

    // 提取消息类型和通道
    const messageType = status & 0xf0;
    const channel = status & 0x0f;

    // 只处理 Note On 和 Note Off 消息
    if (messageType === 0x90 && velocity > 0) {
      // Note On
      const noteEvent: MidiNoteEvent = {
        note,
        velocity,
        channel,
        timestamp: event.timeStamp,
      };
      this.notifyNoteListeners(noteEvent);
    } else if (messageType === 0x80 || (messageType === 0x90 && velocity === 0)) {
      // Note Off（可以忽略，因为我们的检测逻辑基于 Note On）
    }
    // 忽略其他消息类型（CC、SysEx、时钟等）
  }

  /**
   * 添加音符事件监听器
   * @param listener 监听器函数
   * @returns 取消监听的函数
   */
  onNoteEvent(listener: MidiEventListener): () => void {
    this.noteListeners.add(listener);
    return () => {
      this.noteListeners.delete(listener);
    };
  }

  /**
   * 添加设备变化监听器
   * @param listener 监听器函数
   * @returns 取消监听的函数
   */
  onDeviceChange(listener: DeviceChangeListener): () => void {
    this.deviceListeners.add(listener);
    return () => {
      this.deviceListeners.delete(listener);
    };
  }

  /**
   * 通知音符事件监听器
   */
  private notifyNoteListeners(event: MidiNoteEvent): void {
    this.noteListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[MidiService] 监听器执行错误:', error);
      }
    });
  }

  /**
   * 通知设备变化监听器
   */
  private notifyDeviceListeners(): void {
    this.deviceListeners.forEach((listener) => {
      try {
        listener([...this.devices]);
      } catch (error) {
        console.error('[MidiService] 设备监听器执行错误:', error);
      }
    });
  }

  /**
   * 获取可用设备列表
   */
  getDevices(): MidiDeviceInfo[] {
    return [...this.devices];
  }

  /**
   * 获取当前选中的设备
   */
  getSelectedDevice(): MidiDeviceInfo | null {
    if (!this.selectedInput) return null;

    return {
      id: this.selectedInput.id,
      name: this.selectedInput.name || '未知设备',
      manufacturer: this.selectedInput.manufacturer || '未知厂商',
      state: this.selectedInput.state as 'connected' | 'disconnected',
    };
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 断开当前设备连接
   */
  disconnect(): void {
    if (this.selectedInput) {
      this.selectedInput.onmidimessage = null;
      this.selectedInput = null;
    }
  }

  /**
   * 销毁服务，清理资源
   */
  destroy(): void {
    this.disconnect();
    this.noteListeners.clear();
    this.deviceListeners.clear();
    this.midiAccess = null;
    this.initialized = false;
  }
}

// 导出单例实例
export const midiService = new MidiService();

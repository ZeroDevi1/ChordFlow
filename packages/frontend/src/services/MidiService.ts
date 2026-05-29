import JZZ from 'jzz';

/**
 * MIDI 服务层
 * 管理 MIDI 设备连接、授权、消息监听
 */

/** MIDI 初始化结果 */
export type MidiInitResult = 'success' | 'polyfill' | 'notSupported' | 'permissionDenied' | 'insecureContext';

/** 检测当前运行环境是否为 iOS / iPadOS */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

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
  /** 设备类型 */
  type: 'input' | 'output';
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

/** 使用 any 兼容原生 Web MIDI API 和 jzz polyfill 的 MIDIAccess */
type AnyMidiAccess = any;

/**
 * MIDI 服务类
 * 单例模式，管理 Web MIDI API 连接和消息分发
 */
class MidiService {
  /** MIDI 访问接口（使用 any 兼容原生 API 和 jzz polyfill） */
  private midiAccess: AnyMidiAccess = null;
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
  /** 最近一次初始化结果 */
  private lastInitResult: MidiInitResult | null = null;

  /**
   * 初始化 MIDI 服务
   * 请求 MIDI 访问权限并扫描可用设备
   */
  async initialize(): Promise<MidiInitResult> {
    if (this.initialized) return this.lastInitResult ?? 'success';

    // 检查是否处于安全上下文（HTTPS / localhost）
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      console.warn('[MidiService] 当前页面未使用 HTTPS，无法访问 MIDI 设备');
      this.lastInitResult = 'insecureContext';
      return 'insecureContext';
    }

    // 辅助函数：用给定的 requestMIDIAccess 实现完成初始化
    const doInit = async (
      requestAccess: (opts?: any) => Promise<AnyMidiAccess>,
      resultOnSuccess: MidiInitResult
    ): Promise<boolean> => {
      try {
        this.midiAccess = await requestAccess({ sysex: false });
        this.midiAccess.onstatechange = this.handleStateChange.bind(this);
        this.scanDevices();
        this.initialized = true;
        this.lastInitResult = resultOnSuccess;
        return true;
      } catch (error) {
        console.error('[MidiService] 初始化失败:', error);
        if (error instanceof DOMException && error.name === 'SecurityError') {
          this.lastInitResult = 'permissionDenied';
        } else {
          this.lastInitResult = 'notSupported';
        }
        return false;
      }
    };

    // 优先使用原生 Web MIDI API
    if (navigator.requestMIDIAccess) {
      const ok = await doInit(navigator.requestMIDIAccess, 'success');
      if (ok) return 'success';
      // 原生请求失败时继续尝试 polyfill（如权限被拒则不再尝试）
      if (this.lastInitResult === 'permissionDenied') return 'permissionDenied';
    }

    // 原生不支持或失败时，尝试 jzz polyfill
    console.log('[MidiService] 原生 Web MIDI API 不可用，尝试 jzz polyfill...');
    if ((JZZ as any).requestMIDIAccess) {
      const ok = await doInit((JZZ as any).requestMIDIAccess.bind(JZZ), 'polyfill');
      if (ok) {
        console.log('[MidiService] 已通过 jzz polyfill 初始化');
        return 'polyfill';
      }
    }

    // iOS 设备上给出针对性提示
    if (isIOS()) {
      console.warn(
        '[MidiService] iOS / iPadOS 当前浏览器不支持 Web MIDI API。' +
          '建议方案：① 使用支持 Web MIDI 的第三方浏览器（如 Midori via TestFlight）' +
          '② 使用蓝牙 MIDI 桥接 App（如 MIDI Wrench）+ 网络回环' +
          '③ 使用桌面端 Chrome / Edge 浏览器'
      );
    }

    this.lastInitResult = 'notSupported';
    return 'notSupported';
  }

  /**
   * 扫描可用的 MIDI 输入和输出设备
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
        type: 'input',
      });
    });

    // 遍历所有输出设备（用于诊断：当 inputs 为空时用户仍能看到设备存在）
    this.midiAccess.outputs.forEach((output: MIDIOutput) => {
      this.devices.push({
        id: output.id,
        name: output.name || '未知设备',
        manufacturer: output.manufacturer || '未知厂商',
        state: output.state as 'connected' | 'disconnected',
        type: 'output',
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

    console.log('[MidiService] 设备状态变化:', event.port.name, event.port.state, 'type:', event.port.type);
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

    // 查找设备信息，检查是否为输入设备
    const deviceInfo = this.devices.find(d => d.id === deviceId);
    if (deviceInfo && deviceInfo.type === 'output') {
      console.warn('[MidiService] 不能选择输出设备:', deviceInfo.name);
      return false;
    }

    // 查找并连接新设备
    const input = this.midiAccess.inputs.get(deviceId);
    if (!input) {
      console.warn('[MidiService] 设备不存在:', deviceId);
      return false;
    }

    this.selectedInput = input;
    // 非空断言：前面已确认 input 存在并赋值
    this.selectedInput!.onmidimessage = this.handleMidiMessage.bind(this);

    console.log('[MidiService] 已选择设备:', input.name, 'state:', input.state);
    console.log('[MidiService] 已绑定 onmidimessage:', input.name);
    return true;
  }

  /**
   * 处理 MIDI 消息
   */
  private handleMidiMessage(event: MIDIMessageEvent): void {
    if (!event.data) return;

    // 打印所有 MIDI 消息的原始字节，便于排查虚拟键盘消息格式
    console.log('[MidiService] MIDI 原始字节:', Array.from(event.data));

    // 防御性处理：长度不足时直接返回
    if (event.data.length < 2) {
      console.log('[MidiService] MIDI 消息长度不足:', event.data.length);
      return;
    }

    const status = event.data[0];
    const note = event.data[1];
    const velocity = event.data.length > 2 ? event.data[2] : undefined;

    // 提取消息类型和通道
    const messageType = status & 0xf0;
    const channel = status & 0x0f;

    console.log('[MidiService] 解析:', { status, messageType: '0x' + messageType.toString(16), velocity, channel });

    // 只处理 Note On 和 Note Off 消息
    // 注意：部分虚拟键盘发送 Note On with velocity=0 代替 Note Off，此类消息也参与检测
    if (messageType === 0x90 && velocity !== undefined) {
      // Note On（velocity=0 视为 Note Off 的替代表示，但仍触发检测以便兼容虚拟键盘）
      const noteEvent: MidiNoteEvent = {
        note,
        velocity: velocity > 0 ? velocity : 1,
        channel,
        timestamp: event.timeStamp,
      };
      console.log('[MidiService] Note On 分发:', note);
      this.notifyNoteListeners(noteEvent);
    } else if (messageType === 0x80) {
      // Note Off（0x80）
      console.log('[MidiService] Note Off 消息:', { note, channel });
    } else {
      // 未识别的消息类型，打印日志便于排查
      console.log('[MidiService] 未识别消息类型:', '0x' + messageType.toString(16), '状态字节:', '0x' + status.toString(16));
    }
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
      type: 'input',
    };
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 获取最近一次初始化结果
   */
  getLastInitResult(): MidiInitResult | null {
    return this.lastInitResult;
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
    this.lastInitResult = null;
  }
}

// 导出单例实例
export const midiService = new MidiService();

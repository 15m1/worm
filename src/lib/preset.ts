import type { Question } from '../types'
import { newReviewState, uid } from '../types'

export interface PresetItem {
  title: string
  answer: string
  category: string
  difficulty: '简单' | '中等' | '困难'
  tags: string[]
  source?: string
}

// 内置 Java 后端面试高频知识点（八股文）
export const PRESET_QUESTIONS: PresetItem[] = [
  // ---------- Java 基础 ----------
  {
    title: 'HashMap 的底层实现原理？JDK8 相比 JDK7 有哪些变化？',
    category: 'java',
    difficulty: '中等',
    tags: ['集合', 'HashMap'],
    answer: `**底层结构**：数组 + 链表 + 红黑树。\n\n- 数组（Node<K,V>[] table）用于存储桶，通过 key.hashCode() 二次扰动后取模定位桶\n- 当链表长度 ≥ 8 且数组长度 ≥ 64 时，链表转红黑树，降低查询复杂度从 O(n) 到 O(log n)\n\n**JDK8 相比 JDK7 变化**：\n1. 数据结构引入红黑树\n2. 头插法 → 尾插法，解决并发扩容成环问题\n3. 扩容时元素位置：利用 (n-1)&hash 判断高位，要么原位要么 原位置+oldCap\n4. hash 扰动：JDK7 多次异或，JDK8 一次\n\n**要点**：线程不安全、默认容量 16、加载因子 0.75、容量始终为 2 的幂。`,
  },
  {
    title: 'ArrayList 和 LinkedList 的区别？各自的应用场景？',
    category: 'java',
    difficulty: '简单',
    tags: ['集合'],
    answer: `**ArrayList**：基于动态数组，底层 Object[]。\n- 随机访问 O(1)，通过下标\n- 尾部增删 O(1)（均摊），中间插入/删除需移动元素 O(n)\n- 扩容为 1.5 倍（old + old>>1）\n\n**LinkedList**：基于双向链表。\n- 任意位置插入/删除 O(1)（已知节点），但查找节点 O(n)\n- 随机访问 O(n)\n- 额外维护了 first/last 指针，支持队列/双端队列操作\n\n**场景**：频繁随机访问用 ArrayList；频繁增删且规模大用 LinkedList。日常开发 90% 用 ArrayList，因为局部性原理 + 内存占用小。`,
  },
  {
    title: 'String、StringBuilder、StringBuffer 的区别？',
    category: 'java',
    difficulty: '简单',
    tags: ['字符串'],
    answer: `**String**：不可变（final char[] / byte[]），线程安全，每次拼接都会创建新对象，性能差。\n\n**StringBuilder**：可变字符序列，线程不安全，单线程拼接首选，性能最好。\n\n**StringBuffer**：可变，方法加 synchronized，线程安全，但性能略低于 StringBuilder。\n\n**使用建议**：单线程字符串拼接用 StringBuilder；涉及多线程共享才用 StringBuffer；字符串常量池相关用 String。`,
  },
  {
    title: '深拷贝和浅拷贝的区别？如何实现深拷贝？',
    category: 'java',
    difficulty: '简单',
    tags: ['对象', '拷贝'],
    answer: `**浅拷贝**：只拷贝基本类型值和对象引用，新对象的引用字段仍指向原对象。\n**深拷贝**：连引用指向的对象也一并复制，新旧对象完全独立。\n\n**实现方式**：\n1. 重写 clone() 并实现 Cloneable（浅拷贝，需手动逐层深拷贝）\n2. 对象序列化反序列化（需要实现 Serializable，性能一般）\n3. 手动构造器 / 工厂复制每个字段\n4. 使用工具如 Gson/Jackson 序列化转对象、Apache Commons 的 SerializationUtils\n\n**面试加分**：谈序列化实现深拷贝的局限（类需可序列化、static/transient 字段不复制）。`,
  },
  {
    title: 'equals 和 hashCode 的关系？为什么要重写 hashCode？',
    category: 'java',
    difficulty: '中等',
    tags: ['Object'],
    answer: `**约定**：两个对象 equals 相等，则 hashCode 必须相等；hashCode 相等，equals 不一定相等（哈希冲突）。\n\n**为什么**：HashMap/HashSet 先算 hashCode 定位桶，再通过 equals 精确比较。若只重写 equals 不重写 hashCode，相同对象会散落到不同桶，导致集合出现重复元素、get 失效。\n\n**反例**：用两个 new String("a") 相比，String 已重写。自定义类必须同时重写两者，且参与 equals 的字段要参与 hashCode 计算（可用 Objects.hash）。`,
  },

  // ---------- 并发编程 ----------
  {
    title: 'synchronized 的底层原理？锁升级过程？',
    category: 'concurrent',
    difficulty: '困难',
    tags: ['synchronized', '锁'],
    answer: `**底层**：基于 JVM 的 Monitor 监视器锁，对象头中的 Mark Word 记录锁状态，通过 monitorenter/monitorexit 字节码指令实现。\n\n**锁升级（无锁 → 偏向锁 → 轻量级锁 → 重量级锁）**：\n1. **偏向锁**：只有一个线程访问时，Mark Word 记录线程 ID，无 CAS 开销\n2. **轻量级锁**：有竞争时升级，通过 CAS 自旋在栈帧中记录锁记录，避免系统调用\n3. **重量级锁**：自旋失败或竞争激烈，升级为 Monitor，依赖操作系统互斥量，阻塞唤醒\n\n**注意**：JDK15+ 默认禁用了偏向锁。升级是单向的（偏向可撤销），不能降级。`,
  },
  {
    title: 'volatile 关键字的作用和原理？',
    category: 'concurrent',
    difficulty: '中等',
    tags: ['volatile'],
    answer: `**两大作用**：\n1. **可见性**：写 volatile 变量会立即刷新到主内存，读时从主内存读取，禁止工作内存缓存\n2. **有序性**：通过内存屏障禁止指令重排序（LoadLoad / LoadStore / StoreStore / StoreLoad）\n\n**不保证**：原子性。i++ 这种复合操作仍需 synchronized 或 Atomic 类。\n\n**底层**：缓存一致性协议（如 MESI）+ 内存屏障。写操作插入 StoreStore、StoreLoad 屏障；读操作插入 LoadLoad、LoadStore 屏障。\n\n**经典用法**：双重检查锁单例中用 volatile 防止对象发布时的指令重排。`,
  },
  {
    title: 'ThreadLocal 的原理？内存泄漏如何产生和避免？',
    category: 'concurrent',
    difficulty: '困难',
    tags: ['ThreadLocal'],
    answer: `**原理**：每个 Thread 内部持有 ThreadLocalMap（Entry 的 key 是 ThreadLocal 的弱引用，value 是强引用）。存取都以当前线程为维度，线程之间隔离。\n\n**内存泄漏**：Entry 的 key 是弱引用，ThreadLocal 被回收后 key 变 null，但 value 仍是强引用；若线程长期存活（如线程池），value 无法回收 → 泄漏。\n\n**避免**：\n1. 使用完必须调用 **remove()**，尤其在 try/finally 中\n2. 线程池场景务必 remove，否则线程复用会串数据\n\n**加分区**：能回答出「key 弱引用 + value 强引用」和「线程池复用导致串值」。`,
  },
  {
    title: '线程池的核心参数？执行流程是怎样的？',
    category: 'concurrent',
    difficulty: '中等',
    tags: ['线程池'],
    answer: `**7 大核心参数**：corePoolSize（核心线程数）、maximumPoolSize（最大线程数）、keepAliveTime（非核心线程空闲存活时间）、unit、workQueue（任务队列）、threadFactory、handler（拒绝策略）。\n\n**执行流程**：\n1. 核心线程数未满 → 创建核心线程执行\n2. 已满 → 任务放入阻塞队列\n3. 队列已满 → 创建非核心线程直到 maximumPoolSize\n4. 仍满 → 执行拒绝策略（AbortPolicy 抛异常 / CallerRunsPolicy 调用者执行 / DiscardPolicy 丢弃 / DiscardOldestPolicy 丢弃最老）\n\n**生产建议**：不要用 Executors 的 fixed/cached，因为无界队列（LinkedBlockingQueue）会堆积任务、maximumPoolSize 默认 Integer.MAX_VALUE。需自定义 ThreadPoolExecutor 并指定有界队列和合理拒绝策略。`,
  },
  {
    title: 'synchronized 和 ReentrantLock 的区别？',
    category: 'concurrent',
    difficulty: '中等',
    tags: ['锁', 'JUC'],
    answer: `| 维度 | synchronized | ReentrantLock |\n|---|---|---|\n| 实现 | JVM 层（Monitor） | JUC 层（AQS） |\n| 公平性 | 非公平 | 支持公平/非公平 |\n| 响应中断 | 不支持 | 支持 lockInterruptibly |\n| 超时 | 不支持 | tryLock(timeout) |\n| 条件变量 | 一个 wait/notify | 多个 Condition |\n| 性能 | JDK 升级后相近 | - |\n\n**场景**：需要公平锁、超时、可中断、多条件时用 ReentrantLock；简单同步用 synchronized 更简洁。两者都可重入。`,
  },

  // ---------- JVM ----------
  {
    title: 'JVM 内存区域划分？哪些线程私有，哪些共享？',
    category: 'jvm',
    difficulty: '中等',
    tags: ['内存模型'],
    answer: `**线程私有**：\n1. 程序计数器（Program Counter Register）\n2. 虚拟机栈（VM Stack）：存放栈帧，局部变量表、操作数栈等，StackOverflowError / OutOfMemoryError\n3. 本地方法栈（Native Method Stack）\n\n**线程共享**：\n4. 堆（Heap）：对象实例分配，GC 主战场，可划分新生代/老年代\n5. 方法区（Method Area）：JDK8 后为**元空间 Metaspace**，存类信息、常量、静态变量，使用本地内存\n\n**注意**：运行时常量池在方法区（JDK7 前在永久代，JDK7 移入堆，JDK8 在元空间）；字符串常量池 JDK7 起在堆。`,
  },
  {
    title: 'JVM 垃圾回收算法有哪些？各自特点？',
    category: 'jvm',
    difficulty: '中等',
    tags: ['GC'],
    answer: `**标记-清除**：标记存活对象，清除未标记的。产生大量内存碎片。\n\n**标记-复制**：把内存分两块，只用一个，GC 时把存活对象复制到另一块并整体清空。无碎片，但浪费一半空间。新生代用此（Eden:S0:S1=8:1:1）。\n\n**标记-整理**：标记后把存活对象向一端移动，然后清理边界外。无碎片，但移动成本高。老年代用此。\n\n**分代收集**：新生代（复制算法，对象存活率低）+ 老年代（标记-整理/清除）。\n\n**加分**：谈三色标记、并发标记、G1/ZGC 的回收机制。`,
  },
  {
    title: '讲一下类加载的过程？双亲委派机制？',
    category: 'jvm',
    difficulty: '中等',
    tags: ['类加载'],
    answer: `**加载过程（5 步）**：加载 → 验证 → 准备 → 解析 → 初始化（后三步合称连接）。\n\n**双亲委派**：类加载器收到请求后，先委托给父加载器加载，父加载器无法加载时才自己加载。\n- 层级：启动类加载器（Bootstrap，加载 rt.jar）→ 扩展类加载器（Extension）→ 应用类加载器（App）\n\n**为什么**：\n1. 避免类重复加载\n2. 保证核心类安全（如 java.lang.String 不会被自定义同名类替换）\n\n**打破双亲委派**：SPI（如 JDBC 的 ServiceLoader）、Tomcat 的 web 应用隔离。`,
  },

  // ---------- MySQL ----------
  {
    title: 'MySQL 的索引底层为什么用 B+ 树，不用红黑树或 B 树？',
    category: 'mysql',
    difficulty: '中等',
    tags: ['索引'],
    answer: `**为什么不用红黑树**：红黑树是二叉树，树高较高，数据量大时层数多，磁盘 IO 次数多。\n\n**为什么不用 B 树**：B 树的非叶子节点也存数据，导致非叶子节点存储的索引键数量少，树更高；且范围查询需要多次回根节点遍历，效率低。\n\n**B+ 树的优势**：\n1. 非叶子节点只存键不存值，一页能存更多索引，树更矮，磁盘 IO 少\n2. 叶子节点用双向链表相连，**范围查询/排序只需顺序扫描**\n3. 所有数据都在叶子节点，查询路径长度固定，性能稳定\n\n**注意**：一般三层 B+ 树可支撑千万级数据（每次 IO 读一页 16KB）。`,
  },
  {
    title: '什么情况下索引会失效？',
    category: 'mysql',
    difficulty: '中等',
    tags: ['索引', '优化'],
    answer: `常见失效场景：\n1. **违反最左前缀原则**：联合索引跳过最左列\n2. 对索引列使用**函数/表达式**（如 WHERE YEAR(create_time)）\n3. 隐式类型转换：索引列类型和值类型不一致（字符串列查数字）\n4. LIKE 以 % 开头：%xxx 无法走索引（xxx% 可以）\n5. OR 连接非索引列\n6. 索引列参与运算或使用 != 、NOT IN、IS NOT NULL（有时）\n7. 数据量小时优化器选择全表扫描\n8. 排序字段与索引顺序不一致（Using filesort）\n\n**加分**：谈优化器会通过代价估算决定是否走索引，上述是「通常」失效，非绝对。`,
  },
  {
    title: 'MySQL 的隔离级别有哪些？默认是哪级？',
    category: 'mysql',
    difficulty: '中等',
    tags: ['事务', '隔离级别'],
    answer: `**4 种隔离级别**（从低到高）：\n1. **读未提交**（Read Uncommitted）：可读未提交数据，存在脏读\n2. **读已提交**（Read Committed）：只读已提交，解决脏读，存在不可重复读\n3. **可重复读**（Repeatable Read）：解决不可重复读，存在幻读。**MySQL 默认**\n4. **串行化**（Serializable）：全部解决，性能最差\n\n**InnoDB 的 RR 级别**：通过 **MVCC（多版本并发控制）+ 间隙锁（Gap Lock）/Next-Key Lock** 解决了大部分幻读问题。\n\n**实现**：Read View + undo log 版本链。当前读走锁，快照读走 MVCC。`,
  },

  // ---------- Redis ----------
  {
    title: 'Redis 为什么快？底层数据结构？',
    category: 'redis',
    difficulty: '中等',
    tags: ['Redis'],
    answer: `**为什么快**：\n1. 纯内存操作，避免磁盘 IO\n2. **单线程**（6.0 前网络模型单线程），避免上下文切换和锁竞争\n3. IO 多路复用（epoll），单线程处理大量连接\n4. 高效的数据结构设计\n5. 自己实现的内存分配和字符串（SDS）\n\n**核心数据结构**：String（SDS）、Hash（压缩列表/哈希表）、List（快速链表 quicklist）、Set（整数集合/哈希表）、ZSet（跳表 + 哈希表）。\n\n**注意**：Redis 单线程指执行命令是单线程，持久化、过期删除（部分）由其他线程做。6.0 引入多线程处理网络 IO。`,
  },
  {
    title: '缓存穿透、缓存击穿、缓存雪崩的区别和解决方案？',
    category: 'redis',
    difficulty: '中等',
    tags: ['缓存'],
    answer: `**缓存穿透**：查询缓存和 DB 都不存在的数据，大量请求打到 DB。\n→ 方案：布隆过滤器、缓存空值（短 TTL）。\n\n**缓存击穿**：热点 key 过期瞬间，大量并发请求直接打到 DB。\n→ 方案：热点 key 不设过期时间 + 逻辑过期、互斥锁（加锁重建缓存）。\n\n**缓存雪崩**：大量 key 同时过期或 Redis 宕机，请求全部打到 DB。\n→ 方案：过期时间加随机值、多级缓存、熔断限流降级、Redis 集群高可用（主从+哨兵）。\n\n**面试加分**：能区分三者并给出具体场景和组合方案。`,
  },
  {
    title: 'Redis 持久化机制 RDB 和 AOF 的区别？',
    category: 'redis',
    difficulty: '中等',
    tags: ['Redis', '持久化'],
    answer: `**RDB（快照）**：定时把内存数据二进制序列化写入 dump.rdb。\n- 优点：文件小、恢复快、性能影响小\n- 缺点：可能丢失最后一次快照后的数据\n- 实现：fork 子进程，写时复制（COW）\n\n**AOF（追加日志）**：记录每次写命令到 aof 文件，支持 always/everysec/no 三种刷盘策略。\n- 优点：数据丢失少（everysec 最多丢 1 秒）\n- 缺点：文件大、恢复慢、刷盘影响性能\n- 相关：AOF 重写、混合持久化（4.0 后 RDB + AOF）\n\n**4.0 混合持久化**：AOF 文件头部是 RDB 快照，后面追加增量命令，兼顾恢复速度与数据安全。`,
  },

  // ---------- Spring ----------
  {
    title: 'Spring Bean 的生命周期？',
    category: 'spring',
    difficulty: '中等',
    tags: ['Spring', 'Bean'],
    answer: `**大致流程**：\n1. 实例化（构造器创建对象）\n2. **属性填充**（依赖注入）\n3. Aware 回调：BeanNameAware、BeanFactoryAware、ApplicationContextAware\n4. BeanPostProcessor 前置处理（postProcessBeforeInitialization）\n5. 初始化：@PostConstruct、InitializingBean.afterPropertiesSet、自定义 init-method\n6. BeanPostProcessor 后置处理（postProcessAfterInitialization）→ AOP 代理在此生成\n7. 使用\n8. 销毁：@PreDestroy、DisposableBean.destroy、自定义 destroy-method\n\n**加分**：指出 Aware → 初始化 → 后处理器顺序，以及循环依赖如何通过三级缓存解决。`,
  },
  {
    title: 'Spring 如何解决循环依赖？为什么构造器注入不能解决？',
    category: 'spring',
    difficulty: '困难',
    tags: ['Spring', '循环依赖'],
    answer: `**三级缓存**（单例池）：\n1. singletonObjects：一级缓存，完整 Bean\n2. earlySingletonObjects：二级缓存，提前暴露的半成品 Bean（原始对象，未完成属性填充）\n3. singletonFactories：三级缓存，ObjectFactory 工厂，用于生成早期引用并处理 AOP\n\n**流程**：A 依赖 B，A 创建时先把**半成品 A**（三级缓存工厂）暴露出来 → 创建 B，B 依赖 A，B 从三级缓存拿到早期 A 引用 → B 完成注入和初始化 → A 再完成 B 的注入。\n\n**为什么构造器注入不行**：构造器注入在实例化阶段就需要依赖，此时对象还没创建出来，没有半成品可暴露，无法提前引用。\n\n**注意**：代理对象在三级缓存的 ObjectFactory 中提前生成（getEarlyBeanReference），保证注入的是代理。`,
  },

  // ---------- 计算机网络 ----------
  {
    title: 'TCP 三次握手、四次挥手的过程？为什么是 3/4 次？',
    category: 'network',
    difficulty: '中等',
    tags: ['TCP'],
    answer: `**三次握手**：\n1. 客户端 → 服务端：SYN=1, seq=x\n2. 服务端 → 客户端：SYN=1, ACK=1, seq=y, ack=x+1\n3. 客户端 → 服务端：ACK=1, seq=x+1, ack=y+1\n\n**为什么 3 次**：保证双方收发能力正常 + 防止历史失效连接请求（旧 SYN）导致资源浪费。2 次不够，因为无法确认对方收到自己的 SYN。\n\n**四次挥手**：\n1. 主动方：FIN=1（不再发数据）\n2. 被动方：ACK（确认收到）→ 半关闭\n3. 被动方：FIN=1（数据发送完毕）\n4. 主动方：ACK → 主动方等待 2MSL 后关闭\n\n**为什么 4 次**：被动方收到 FIN 后可能还有数据要发，ACK 和 FIN 不能合并。**为什么 2MSL**：确保最后一个 ACK 能到达，且让旧报文在网络中消亡。`,
  },
  {
    title: 'HTTPS 的握手过程？对称/非对称加密如何配合？',
    category: 'network',
    difficulty: '困难',
    tags: ['HTTPS'],
    answer: `**TLS 握手（RSA 版本简化）**：\n1. 客户端发 ClientHello（支持的加密套件、随机数）\n2. 服务端发 ServerHello（选定的套件、随机数）+ 数字证书\n3. 客户端验证证书，用证书公钥加密「预主密钥」发给服务端\n4. 双方用随机数 + 预主密钥生成**会话密钥（对称密钥）**\n5. 之后用对称加密通信\n\n**为什么混合**：\n- 非对称加密（RSA/ECC）用于**密钥交换和认证**，安全但慢\n- 对称加密（AES）用于**数据加密**，快\n- 用非对称协商出对称密钥，兼顾安全与性能\n\n**加分**：谈 ECDHE 密钥交换、前向保密、证书链验证、HTTP/2 多路复用。`,
  },

  // ---------- 分布式 ----------
  {
    title: '分布式系统的一致性：CAP 和 BASE 理论？',
    category: 'distributed',
    difficulty: '中等',
    tags: ['CAP', 'BASE'],
    answer: `**CAP**：Consistency（一致性）、Availability（可用性）、Partition tolerance（分区容错性）三者最多同时满足两个。网络分区（P）无法避免，所以实际是在 C 和 A 之间取舍。\n\n**BASE**：\n- Basically Available（基本可用）\n- Soft state（软状态/最终一致）\n- Eventually consistent（最终一致）\n\n**实践**：多数分布式系统选择 AP + 最终一致性，通过消息队列、补偿、对账实现最终一致。**强一致场景**（如金融）用 CP，如 ZooKeeper、etcd。`,
  },

  // ---------- 算法 ----------
  {
    title: '手写：反转单链表（迭代 + 递归）',
    category: 'algorithm',
    difficulty: '简单',
    tags: ['链表'],
    answer: `**迭代**：\n\`\`\`java\nListNode prev = null, cur = head;\nwhile (cur != null) {\n    ListNode next = cur.next;\n    cur.next = prev;\n    prev = cur;\n    cur = next;\n}\nreturn prev;\n\`\`\`\n\n**递归**：\n\`\`\`java\npublic ListNode reverseList(ListNode head) {\n    if (head == null || head.next == null) return head;\n    ListNode newHead = reverseList(head.next);\n    head.next.next = head;\n    head.next = null;\n    return newHead;\n}\n\`\`\`\n\n时间复杂度 O(n)，空间：迭代 O(1)，递归 O(n)。`,
  },
  {
    title: '手写：二分查找（含边界）',
    category: 'algorithm',
    difficulty: '简单',
    tags: ['二分'],
    answer: `**标准写法**：\n\`\`\`java\nint l = 0, r = nums.length - 1;\nwhile (l <= r) {\n    int mid = l + (r - l) / 2; // 防溢出\n    if (nums[mid] == target) return mid;\n    else if (nums[mid] < target) l = mid + 1;\n    else r = mid - 1;\n}\nreturn -1;\n\`\`\`\n\n**注意**：\n1. 用 \`l + (r - l) / 2\` 防止 l+r 溢出\n2. 边界条件 l <= r 还是 l < r 取决于区间定义（闭区间用 <=）\n3. 找左边界/右边界用「排除法」模板：\n\`\`\`java\nwhile (l < r) { int m = l + (r - l) / 2; if (check(m)) r = m; else l = m + 1; }\n\`\`\`\n\n时间 O(log n)，空间 O(1)。`,
  },

  // ---------- Spring MVC ----------
  {
    title: 'Spring MVC 处理一个请求的完整流程？',
    category: 'spring-mvc',
    difficulty: '中等',
    tags: ['Spring MVC', 'DispatcherServlet'],
    answer: `**核心流程**（围绕 DispatcherServlet）：\n1. 请求到达 **DispatcherServlet**（前端控制器）\n2. DispatcherServlet 通过 **HandlerMapping** 找到对应的 Controller（处理器）\n3. 通过 **HandlerAdapter** 调用处理器，执行 Controller 方法\n4. 执行拦截器（Interceptor）preHandle → 业务方法 → postHandle\n5. Controller 返回 ModelAndView（或 @ResponseBody 直接返回数据）\n6. 视图解析器 ViewResolver 解析视图，渲染返回给客户端\n\n**加分**：说出 DispatcherServlet 的初始化加载（WebApplicationContext）、HandlerExceptionResolver 异常处理、视图解析的层次。`,
  },
  {
    title: '@Controller 和 @RestController 的区别？',
    category: 'spring-mvc',
    difficulty: '简单',
    tags: ['Spring MVC', '注解'],
    answer: `**@Controller**：控制器注解，方法返回值通常为视图名，配合视图解析器渲染页面（返回字符串默认走视图解析）。\n\n**@RestController** = @Controller + @ResponseBody，方法返回值直接序列化为 JSON/XML 返回给前端，不经过视图解析器。\n\n**注意**：@Controller 方法上单独加 @ResponseBody 也能返回 JSON，多用于老代码；REST 风格接口统一用 @RestController。`,
  },
  {
    title: 'Spring MVC 参数绑定：@RequestParam、@PathVariable、@RequestBody 的区别？',
    category: 'spring-mvc',
    difficulty: '简单',
    tags: ['Spring MVC', '参数绑定'],
    answer: `**@RequestParam**：绑定 URL 查询参数 / 表单字段。\n- 例：\`GET /api?name=xx\` → @RequestParam String name\n- 可设 required、defaultValue\n\n**@PathVariable**：绑定 URL 路径变量。\n- 例：\`GET /api/{id}\` → @PathVariable Long id\n\n**@RequestBody**：绑定请求体（JSON 字符串），由 HttpMessageConverter 反序列化为对象。\n- 通常用于 POST/PUT 传 JSON，配 @Valid 做参数校验\n\n**对比**：三者分别对应 query 参数、路径参数、请求体，REST 风格下常用组合使用。`,
  },
  {
    title: '拦截器（Interceptor）和过滤器（Filter）的区别？',
    category: 'spring-mvc',
    difficulty: '中等',
    tags: ['Spring MVC', '拦截器'],
    answer: `| 维度 | Filter | Interceptor |\n|---|---|---|\n| 层次 | Servlet 层，先执行 | Spring MVC 层，后执行 |\n| 依赖容器 | 依赖 Servlet 容器 | 依赖 Spring 容器，可用 Spring Bean |\n| 作用范围 | 所有请求（包括静态资源） | 仅经过 DispatcherServlet 的请求 |\n| 拦截粒度 | 粗 | 细（可拿到 HandlerMethod） |\n| 生命周期 | doFilter 一次 | preHandle → postHandle → afterCompletion |\n\n**场景**：Filter 做编码、跨域、日志（Servlet 级）；Interceptor 做登录鉴权、权限校验（能拿到 handler）、性能监控。`,
  },
  {
    title: 'Spring MVC 全局异常处理怎么做？',
    category: 'spring-mvc',
    difficulty: '简单',
    tags: ['Spring MVC', '异常'],
    answer: `**@ControllerAdvice + @ExceptionHandler**（推荐）：\n\`\`\`java\n@RestControllerAdvice\npublic class GlobalExceptionHandler {\n    @ExceptionHandler(BusinessException.class)\n    public Result handle(BusinessException e) { return Result.fail(e.getMsg()); }\n}\n\`\`\`\n\n**其他方式**：\n1. 实现 HandlerExceptionResolver（全局，底层机制）\n2. @ExceptionHandler 放在单个 Controller 内（仅本 Controller）\n3. 实现 ErrorController / @ControllerAdvice 兜底\n\n**要点**：@RestControllerAdvice = @ControllerAdvice + @ResponseBody，统一返回 JSON 错误结构；配合自定义业务异常（带错误码）使用。`,
  },

  // ---------- Spring Cloud ----------
  {
    title: 'Spring Cloud 有哪些核心组件？各自的作用？',
    category: 'spring-cloud',
    difficulty: '中等',
    tags: ['Spring Cloud', '微服务'],
    answer: `**核心组件**：\n1. **注册中心**：Eureka（停更）/ Nacos（主流）/ Consul——服务注册与发现\n2. **负载均衡**：Ribbon（已进维护）/ Spring Cloud LoadBalancer——客户端负载均衡\n3. **远程调用**：OpenFeign——声明式 HTTP 客户端\n4. **熔断降级**：Hystrix（停更）/ Sentinel / Resilience4j——熔断、降级、限流\n5. **网关**：Zuul（已停）/ Spring Cloud Gateway——路由转发、统一鉴权\n6. **配置中心**：Spring Cloud Config / Nacos Config——配置统一管理、动态刷新\n7. **链路追踪**：Sleuth + Zipkin\n8. **消息驱动**：Spring Cloud Stream\n\n**加分**：能说明 Nacos 比 Eureka 强在哪（支持 AP/CP 切换、配置中心一体化、支持长轮询）。`,
  },
  {
    title: '服务注册与发现的原理？Eureka 的工作机制？',
    category: 'spring-cloud',
    difficulty: '中等',
    tags: ['Spring Cloud', 'Eureka'],
    answer: `**三要素**：\n1. **注册**：服务启动时向注册中心上报自身 IP、端口、服务名\n2. **发现**：消费者从注册中心拉取服务列表，本地缓存\n3. **心跳**：服务定期发送心跳，注册中心剔除失联实例\n\n**Eureka 机制**：\n- 服务提供者启动注册，每 30s 发心跳续约\n- 服务消费者定时拉取注册表并本地缓存\n- Eureka 服务端 90s 未收到心跳则剔除该实例\n- **自我保护**：短时间内丢失大量心跳时，Eureka 进入保护模式，不剔除实例（宁可保留错误实例，避免雪崩）\n\n**对比 Nacos**：Nacos 支持临时/持久实例、健康检查更灵活、支持 AP+CP 切换。`,
  },
  {
    title: 'Hystrix 和 Sentinel 的区别？服务熔断降级怎么做？',
    category: 'spring-cloud',
    difficulty: '中等',
    tags: ['Spring Cloud', 'Sentinel'],
    answer: `**区别**：\n- **Hystrix**：已进入维护模式；线程池隔离/信号量隔离；只支持熔断降级\n- **Sentinel**：阿里开源，轻量级；支持**流量控制（QPS/并发数）、熔断降级、系统自适应保护**；控制台可视化、细粒度规则、热点限流\n\n**熔断降级流程**：\n1. 熔断：失败率/慢调用比例超过阈值 → 熔断开启，直接快速失败\n2. 降级：触发兜底方法（@SentinelResource fallback / blockHandler）\n3. 恢复：熔断时间窗口后探测请求，成功则关闭熔断\n\n**要点**：熔断是保护下游，降级是自身兜底，限流是保护自己。`,
  },
  {
    title: '微服务网关的作用？Gateway 的核心流程？',
    category: 'spring-cloud',
    difficulty: '简单',
    tags: ['Spring Cloud', 'Gateway'],
    answer: `**网关作用**：统一入口、路由转发、鉴权认证、限流、日志、跨域、灰度发布、聚合请求。\n\n**Spring Cloud Gateway 核心**：\n- **路由（Route）**：ID + 目标 URI + 断言 + 过滤器\n- **断言（Predicate）**：匹配条件（Path、Method、Header、Host、时间等）\n- **过滤器（Filter）**：请求转发前后增强（GlobalFilter + GatewayFilter）\n\n**流程**：客户端请求 → Gateway 根据路由断言匹配 → 过滤器链处理 → 转发到下游服务 → 响应返回。\n\n**对比 Zuul**：Gateway 基于 WebFlux 响应式非阻塞，性能更好，是主流选择。`,
  },
  {
    title: '分布式配置中心（Nacos Config）是怎么实现动态刷新的？',
    category: 'spring-cloud',
    difficulty: '中等',
    tags: ['Spring Cloud', 'Nacos'],
    answer: `**原理**：\n1. 应用启动时从 Nacos 拉取配置并初始化\n2. 客户端向 Nacos **长轮询**（long polling）监听配置变更，默认 30s 超时\n3. 配置变更时 Nacos 推送通知 → 客户端重新拉取 → 触发 refresh 事件\n4. @RefreshScope 的 Bean 会重新创建，@Value 属性更新\n\n**要点**：\n- 长轮询比定时轮询实时性更好、连接开销小\n- @RefreshScope 重新实例化 Bean 实现热更新\n- 配置中心数据存储在数据库/Nacos 自身存储，支持命名空间隔离环境`,
  },
  {
    title: 'OpenFeign 和 Ribbon 是如何配合做远程调用的？',
    category: 'spring-cloud',
    difficulty: '简单',
    tags: ['Spring Cloud', 'OpenFeign'],
    answer: `**OpenFeign**：声明式 HTTP 客户端，用接口 + 注解定义远程调用，屏蔽 HTTP 细节。\n\n**Ribbon / LoadBalancer**：客户端负载均衡器，从注册中心拉取服务实例列表，按策略（轮询/随机/加权）选择一个实例。\n\n**配合流程**：\n1. Feign 根据 @FeignClient(name="order-service") 确定服务名\n2. LoadBalancer 拦截请求，用服务名从注册中心选一个实例（IP:端口）\n3. Feign 组装 HTTP 请求并发送，反序列化响应\n\n**要点**：服务名 → 负载均衡选实例 → 发请求，这是客户端负载均衡区别于 Nginx 服务端负载均衡的核心。`,
  },

  // ---------- RabbitMQ ----------
  {
    title: 'RabbitMQ 的核心概念？消息模型是怎样的？',
    category: 'rabbitmq',
    difficulty: '简单',
    tags: ['RabbitMQ', 'AMQP'],
    answer: `**核心概念**：\n- **Producer / Consumer**：生产者、消费者\n- **Broker**：消息服务器\n- **Exchange（交换机）**：接收消息并按路由规则转发，类型有 direct / topic / fanout / headers\n- **Queue（队列）**：存储消息，消费者从队列取消息\n- **Binding**：交换机和队列的绑定关系（含 routing key）\n- **Virtual Host**：逻辑隔离\n\n**模型**：\n生产者 → Exchange → （按 RoutingKey 匹配 Binding）→ Queue → 消费者\n\n**交换机类型**：\n- direct：精确匹配 routingKey\n- topic：通配符匹配（* 一个词，# 多个词）\n- fanout：广播，忽略 routingKey\n\n**加分**：能画出一条完整消息流并说明各类型交换机的典型场景。`,
  },
  {
    title: 'RabbitMQ 如何保证消息不丢失？',
    category: 'rabbitmq',
    difficulty: '中等',
    tags: ['RabbitMQ', '可靠性'],
    answer: `**消息全链路可靠（三个环节）**：\n\n**1. 生产者 → 交换机/队列（发送端）**：\n- 开启**确认模式**（Confirm）：发送后等待 Broker 的 confirm ack\n- 发送失败/未确认 → 重发或记录失败消息\n\n**2. 交换机 → 队列（路由端）**：\n- 开启**退回模式**（Return）处理路由不到的消息\n- 设置 mandatory=true，路由失败触发 return 回调\n\n**3. 队列存储 + 消费端**：\n- 队列和消息**持久化**（durable + deliveryMode=2）\n- 消费端关闭自动 ack，**手动确认**（basicAck），处理成功再确认\n- 消费失败重试或进死信队列\n\n**总结**：Confirm + Return + 持久化 + 手动 ack，四层保证不丢消息。`,
  },
  {
    title: 'RabbitMQ 消息的幂等性如何保证？',
    category: 'rabbitmq',
    difficulty: '中等',
    tags: ['RabbitMQ', '幂等'],
    answer: `**问题来源**：消费端处理成功后 ack 丢失、或消息重发，导致同一消息被消费多次。\n\n**解决方案**：\n1. **唯一消息 ID**：生产者给每条消息生成全局唯一 ID，消费者用**数据库唯一约束 / 业务主键**去重，重复插入直接失败或忽略\n2. **Redis 去重**：消费前 SETNX 消息 ID（带过期时间），存在则跳过\n3. **乐观锁 / 版本号**：更新时校验版本，防止重复更新覆盖\n4. **状态机**：业务状态流转，已处理状态直接返回成功\n\n**要点**：幂等是消费端的责任，重点在「重复消费不产生副作用」，常用「唯一主键 + 状态检查」组合。`,
  },
  {
    title: '什么是死信队列？有什么应用场景？',
    category: 'rabbitmq',
    difficulty: '中等',
    tags: ['RabbitMQ', '死信队列'],
    answer: `**死信（Dead Letter）**：消息满足以下任一条件进入死信队列：\n1. 消息被 **basicNack / basicReject** 且 requeue=false\n2. 消息 **TTL 过期**（超时未被消费）\n3. 队列长度达到上限被丢弃\n\n**实现**：声明死信交换机（DLX）+ 死信队列，原队列绑定到 DLX（x-dead-letter-exchange），死信消息自动转发到死信队列。\n\n**应用场景**：\n1. **延迟队列**：TTL + 死信实现定时任务/延迟消息（如订单超时关闭）\n2. **消息补偿**：消费失败进死信，定时扫描重投或告警\n3. **降级处理**：积压消息进死信队列单独处理\n\n**加分**：提一下 RabbitMQ 延迟队列插件（rabbitmq_delayed_message_exchange）。`,
  },
  {
    title: '如何保证消息的消费顺序？',
    category: 'rabbitmq',
    difficulty: '中等',
    tags: ['RabbitMQ', '顺序消息'],
    answer: `**问题**：多个消费者并行消费、或消息路由到不同队列，导致顺序错乱。\n\n**解决思路**：\n1. **单队列 + 单消费者**：最简单，保证严格顺序，但吞吐低\n2. **业务维度的顺序**：把同一业务（如同一订单）的消息通过**一致性哈希**/固定 routingKey 路由到**同一个队列**，用**单消费者**或**多消费者按 key 串行**处理\n3. **多消费者串行化**：消费者内部按业务 key 加锁/串行处理，避免并发消费同一业务消息\n4. **结合事务/DB**：消费时校验前置状态（如先更新 A 才能更新 B）\n\n**注意**：顺序消息通常牺牲一部分吞吐，优先保证「同一业务关键链路」的顺序即可。`,
  },

  // ---------- Redis 补充 ----------
  {
    title: 'Redis 的数据淘汰策略有哪些？',
    category: 'redis',
    difficulty: '中等',
    tags: ['Redis', '淘汰策略'],
    answer: `**8 种策略**（maxmemory-policy 配置）：\n\n**不淘汰**：\n- noeviction：内存满直接返回错误（默认）\n\n**只淘汰过期 key**：\n- volatile-lru：从已设置过期时间的 key 中淘汰最久未使用\n- volatile-lfu：从已设过期时间中淘汰最不常用\n- volatile-ttl：淘汰剩余 TTL 最短的\n- volatile-random：随机淘汰\n\n**所有 key**：\n- allkeys-lru：淘汰所有 key 中最久未使用（**最常用**）\n- allkeys-lfu：淘汰所有 key 中最不常用\n- allkeys-random：随机淘汰\n\n**要点**：LFU 考虑访问频率，LRU 只考虑最近访问；热点数据用 allkeys-lfu 更合理。`,
  },
  {
    title: 'Redis 高可用方案：主从复制、哨兵、Cluster 的区别？',
    category: 'redis',
    difficulty: '中等',
    tags: ['Redis', '集群'],
    answer: `**主从复制**：一主多从，主写从读。\n- 数据冗余 + 读写分离，但主故障需要手动切换，无高可用\n\n**哨兵（Sentinel）**：在主从基础上加哨兵节点监控。\n- 主节点故障时**自动故障转移**（选举新主）\n- 提供高可用，但数据量受单机内存限制，**不解决容量问题**\n\n**Cluster（集群）**：数据分片存储（16384 个槽）。\n- 节点间自动分配槽位，key 通过 CRC16 计算落到对应节点\n- **横向扩容**、无中心化、自带故障转移（集群模式）\n- 客户端直连任意节点，跨槽命令需 MOVED 重定向\n\n**要点**：哨兵解决「高可用」，集群解决「容量 + 高可用」；小规模用哨兵，大规模用 Cluster。`,
  },
  {
    title: 'Redis 分布式锁的正确实现？Redisson 的原理？',
    category: 'redis',
    difficulty: '困难',
    tags: ['Redis', '分布式锁'],
    answer: `**基础实现**：\n\`SET key value NX EX seconds\`（原子）加锁，Lua 脚本比对 value 后 DEL 解锁。\n\n**必须注意**：\n1. 加锁要**原子**（NX + EX 同时）\n2. 解锁要**校验 value（唯一标识）**防误删他人锁\n3. 解锁要用 **Lua 脚本**保证「比对 + 删除」原子\n4. **过期时间**要大于业务执行时间，避免死锁\n\n**Redisson**：\n- 基于**看门狗（watch dog）**自动续期，默认 30s，业务未结束自动续期，避免锁过期\n- 支持**可重入锁**、公平锁、读写锁、红锁\n- 使用 Lua 脚本保证复杂操作原子性\n\n**Redlock（红锁）**：多节点加锁（N/2+1 成功）解决主从切换丢锁问题，但存在争议，业务权衡使用。`,
  },

  // ---------- Spring 补充 ----------
  {
    title: 'Spring Boot 自动配置的原理？',
    category: 'spring',
    difficulty: '中等',
    tags: ['Spring Boot', '自动配置'],
    answer: `**核心**：**@EnableAutoConfiguration** + SpringFactoriesLoader。\n\n**流程**：\n1. 启动类 @SpringBootApplication 包含 @EnableAutoConfiguration\n2. 加载 META-INF/spring.factories 中的 **AutoConfiguration.imports**（自动配置类列表）\n3. 每个自动配置类用 **@ConditionalOnXxx**（条件注解）按需生效：\n   - @ConditionalOnClass：classpath 存在某类才生效\n   - @ConditionalOnMissingBean：容器无某 Bean 才生效\n   - @ConditionalOnProperty：配置项满足才生效\n4. 通过 @EnableConfigurationProperties 绑定 application.yml 属性\n\n**要点**：自动配置 = 约定优于配置；条件注解 + 属性绑定实现按需注入。自定义 starter 也是这套机制。`,
  },
  {
    title: 'Spring AOP 的实现原理？JDK 动态代理和 CGLIB 的区别？',
    category: 'spring',
    difficulty: '中等',
    tags: ['Spring', 'AOP'],
    answer: `**原理**：AOP 基于**动态代理**，在运行时生成代理对象包裹目标 Bean，拦截方法调用执行通知（Advice）。\n\n**两种代理**：\n1. **JDK 动态代理**：基于**接口**，生成实现同接口的代理类（InvocationHandler）。目标类必须实现接口。\n2. **CGLIB 代理**：基于**继承**，生成目标类的子类，重写方法（MethodInterceptor）。目标类不能是 final。\n\n**选择**：\n- Spring 默认：目标有接口 → JDK 代理；无接口 → CGLIB\n- Spring Boot 2.x 起默认**强制 CGLIB**（proxyTargetClass=true）\n\n**局限**：\n- **自调用失效**：同类内 this 调用不走代理\n- CGLIB 不能代理 final 类/方法\n- 代理只在 Spring 容器管理的 Bean 上生效`,
  },

  // ---------- 分布式 补充 ----------
  {
    title: '分布式事务的解决方案有哪些？',
    category: 'distributed',
    difficulty: '困难',
    tags: ['分布式事务', '2PC', 'TCC'],
    answer: `**常见方案**：\n\n1. **2PC（两阶段提交）**：准备阶段 + 提交阶段，协调者统一提交/回滚。\n   - 实现：XA、Seata AT 模式\n   - 缺点：同步阻塞、协调者单点、prepare 后宕机问题\n\n2. **TCC（Try-Confirm-Cancel）**：\n   - Try 预留资源 → Confirm 确认 → Cancel 取消\n   - 侵入业务强，需自己写三套逻辑，适合对一致性要求高的场景\n\n3. **本地消息表**：\n   - 业务 + 消息写同一个本地事务，异步投递消息，下游消费\n   - 简单可靠，适合最终一致\n\n4. **消息队列 + 最终一致性**（主流）：\n   - 事务消息（RocketMQ）/ 本地消息表，MQ 保证投递，消费端幂等\n\n5. **最大努力通知 / Saga**：\n   - 长事务拆分为子事务 + 补偿，适合业务流程长的场景\n\n**要点**：强一致选 2PC/TCC，最终一致选 MQ/本地消息表；生产上「可靠消息 + 对账补偿」最常见。`,
  },

  // ---------- 算法 补充 ----------
  {
    title: '手写：LRU 缓存（最近最少使用）',
    category: 'algorithm',
    difficulty: '中等',
    tags: ['LRU', '缓存'],
    answer: `**思路**：HashMap 存 key→节点 + 双向链表维护访问顺序。\n\n\`\`\`java\nclass LRUCache {\n    class Node { int k, v; Node pre, next; Node(int k,int v){this.k=k;this.v=v;} }\n    HashMap<Integer,Node> map = new HashMap<>();\n    Node head, tail; int cap;\n\n    public LRUCache(int c) {\n        cap = c;\n        head = new Node(0,0); tail = new Node(0,0);\n        head.next = tail; tail.pre = head;\n    }\n    public int get(int key) {\n        if (!map.containsKey(key)) return -1;\n        Node n = map.get(key);\n        moveToHead(n);\n        return n.v;\n    }\n    public void put(int key, int value) {\n        if (map.containsKey(key)) {\n            Node n = map.get(key); n.v = value;\n            moveToHead(n);\n        } else {\n            Node n = new Node(key, value);\n            map.put(key, n); addToHead(n);\n            if (map.size() > cap) {\n                Node last = tail.pre;\n                removeNode(last); map.remove(last.k);\n            }\n        }\n    }\n    // moveToHead / addToHead / removeNode 双向链表操作\n}\n\`\`\`\n\nget/put 均 O(1)。也可用 LinkedHashMap（accessOrder=true）一行核心实现。`,
  },

  // ---------- Java 补充 ----------
  {
    title: 'Java 反射机制是什么？应用场景有哪些？',
    category: 'java',
    difficulty: '简单',
    tags: ['反射'],
    answer: `**定义**：程序在**运行期**动态获取类的完整信息（类名、方法、字段、构造器、注解）并能操作对象的能力。\n\n**核心 API**：Class / Field / Method / Constructor，通过 Class 对象获取。\n\n**应用场景**：\n1. **Spring 框架**：IoC 通过反射实例化 Bean、依赖注入；AOP 生成动态代理\n2. **ORM 框架**（MyBatis/MyBatis-Plus）：实体字段与数据库列映射\n3. **动态代理**：JDK Proxy + InvocationHandler\n4. **序列化/JSON**：Jackson/Gson 反射读写字段\n5. **SPI / 注解处理**、IDE 调试器\n\n**注意**：反射性能低于直接调用（可缓存 Method 对象缓解），且会绕过访问控制、带来安全风险。`,
  },
]

export function buildPresetQuestions(): Question[] {
  const now = Date.now()
  return PRESET_QUESTIONS.map((p) => ({
    id: uid(),
    title: p.title,
    answer: p.answer,
    category: p.category,
    difficulty: p.difficulty,
    tags: p.tags,
    source: p.source ?? '预设题库',
    isPreset: true,
    isFavorite: false,
    wrong: false,
    createdAt: now,
    updatedAt: now,
    review: newReviewState(),
  }))
}

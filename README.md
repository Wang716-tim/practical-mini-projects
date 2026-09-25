# Practical Mini Projects｜三个可复制的小项目

![项目封面：三个可复制的小项目](cover.svg)

**选择方案、检查数据、巡检链接。** 三个项目分别解决一个明确问题，包含示例输入、运行方法、测试与适用边界。

> 📦 [下载完整源码（ZIP）](practical-mini-projects.zip)。解压后，`projects/` 下的三个目录可以分别运行与复制。封面、页面截图、逐项目 README 和测试均在包内。

**在线查看核心源码**：[决策规则](decision.mjs) · [CSV 解析与校验](csv.mjs) · [链接巡检 CLI](link_auditor.py)。

## 1. Decision Notebook｜决策记录本

**场景**：一个小团队的常用资料分散在多处，希望在两周内改善知识查找。比较高频问题检索页、完整知识平台和整理现有目录三种做法。

- **实现要点**：给维度设置权重，为每个方案记录评分与文字依据；分数和证据覆盖率分别呈现。依据不足或方案接近时提示继续验证。
- **技术**：原生 HTML、CSS 和 JavaScript；无需运行时依赖。
- **运行**：解压后进入 `projects/decision-notebook`，执行 `python -m http.server 8000`，打开 `http://localhost:8000`；`npm test` 检查判断规则。
- **边界**：示例评分和阈值是产品演示设定，不能代替对实际资料与约束的核查。

## 2. CSV Lens｜订单数据体检

**场景**：订单 CSV 交给分析师前，先定位缺失值、重复订单号和格式异常的记录，导出可复核的问题清单。

- **实现要点**：解析带引号的 CSV、保留物理行号、检查列数和重复键、下载报告。
- **技术**：原生 HTML、CSS 和 JavaScript；文件在浏览器本地处理。
- **运行**：进入 `projects/csv-quality-check`，执行 `python -m http.server 8001`，打开 `http://localhost:8001`；`npm test` 检查解析器。
- **边界**：适合小型 UTF-8 CSV 的结构检查，不自动修改原始数据。

## 3. Link Auditor｜链接巡检

**场景**：帮助中心搬迁后，批量检查关键链接是否正常、重定向或失效。

- **实现要点**：请求超时处理、`HEAD` 不受支持时回退 `GET`、结果分类和 CSV 报告。
- **技术**：Python 标准库，无第三方依赖。
- **运行**：进入 `projects/link-auditor`，执行 `python demo.py` 查看本机演示；执行 `python -m unittest discover -s tests -v` 跑测试。
- **边界**：状态是检查时刻的快照；限流、登录与临时故障需要人工复核。

## 验证与复用

本地测试结果：Decision Notebook **5/5**、CSV Lens **5/5**、Link Auditor **4/4**。决策情境、订单记录和演示网站均为**模拟材料**。

每个项目都可以单独复制。复用时先运行示例，再替换成有权处理的实际输入，并保留测试结果与设计取舍记录。完整目录和 MIT License 见源码包。

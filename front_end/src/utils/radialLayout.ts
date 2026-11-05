/**
 * radialLayout.ts
 * Tiện ích toán học lượng giác để phân bổ các icon/nút theo cung tròn hoặc Elip (radial / elliptical arc layout)
 * Dùng cho UI Game HUD góc phần tư và bán nguyệt
 */

export interface RadialPoint {
  x: number
  y: number
  angleDeg: number
  angleRad: number
}

export interface RadialLayoutOptions {
  /** Bán kính đơn lẻ (dùng chung cho cả X và Y nếu không truyền radiusX/radiusY) */
  radius?: number
  /** Bán kính ngang (trục X) cho quỹ đạo hình Elip (pixels). Mặc định bằng radius hoặc 195 */
  radiusX?: number
  /** Bán kính dọc (trục Y) cho quỹ đạo hình Elip (pixels). Mặc định bằng radius hoặc 195 */
  radiusY?: number
  /** Góc bắt đầu tính bằng độ (0 độ = hướng 3h, 90 độ = hướng 6h). Mặc định 12 */
  startAngleDeg?: number
  /** Góc kết thúc tính bằng độ. Mặc định 82 */
  endAngleDeg?: number
  /** Tọa độ điểm tâm (pixels). Mặc định (0, 0) - góc trên cùng bên trái */
  origin?: { x: number; y: number }
  /** Đường kính của icon nút tròn (pixels). Mặc định 44 */
  iconSize?: number
}

/**
 * Tính toán tọa độ (x, y) cho N phần tử tỏa đều dọc theo cung Elip hoặc tròn
 * Công thức:
 * x = origin.x + radiusX * cos(rad) - iconSize / 2
 * y = origin.y + radiusY * sin(rad) - iconSize / 2
 *
 * @param count Số lượng icon / phần tử cần phân bổ
 * @param options Cấu hình bán kính X/Y, góc quét, tâm và kích thước icon
 * @returns Mảng các điểm { x, y, angleDeg, angleRad } để gán trực tiếp style `left: ${x}px; top: ${y}px`
 */
export function calculateRadialPositions(
  count: number,
  options: RadialLayoutOptions = {},
): RadialPoint[] {
  const {
    radius = 195,
    radiusX: customRadiusX,
    radiusY: customRadiusY,
    startAngleDeg = 12,
    endAngleDeg = 82,
    origin = { x: 0, y: 0 },
    iconSize = 44,
  } = options

  if (count <= 0) return []

  const rx = customRadiusX ?? radius
  const ry = customRadiusY ?? radius
  const halfSize = iconSize / 2

  // Nếu chỉ có 1 nút, đặt vào chính giữa cung
  if (count === 1) {
    const midAngle = (startAngleDeg + endAngleDeg) / 2
    const rad = (midAngle * Math.PI) / 180
    return [
      {
        x: Math.round(origin.x + rx * Math.cos(rad) - halfSize),
        y: Math.round(origin.y + ry * Math.sin(rad) - halfSize),
        angleDeg: midAngle,
        angleRad: rad,
      },
    ]
  }

  const step = (endAngleDeg - startAngleDeg) / (count - 1)

  return Array.from({ length: count }, (_, i) => {
    const angleDeg = startAngleDeg + i * step
    const rad = (angleDeg * Math.PI) / 180
    return {
      x: Math.round(origin.x + rx * Math.cos(rad) - halfSize),
      y: Math.round(origin.y + ry * Math.sin(rad) - halfSize),
      angleDeg,
      angleRad: rad,
    }
  })
}

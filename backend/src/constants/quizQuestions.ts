export interface BlockchainQuestion {
  id: number
  topic: string
  question: string
  options: [string, string, string, string]
  correctIndex: number // 0, 1, 2, or 3 (Lưu bảo mật ở Backend)
  rewardCoins: number
  rewardXp: number
  explanation: string
}

export const BLOCKCHAIN_QUIZ_CATALOG: BlockchainQuestion[] = [
  {
    id: 1,
    topic: 'Bảo Mật Ví',
    question: 'Khóa riêng tư (Private Key) của ví Web3 có vai trò gì quan trọng nhất?',
    options: [
      'Là mật khẩu công khai để người khác gửi coin cho bạn',
      'Là chìa khóa tối cao nắm quyền kiểm soát và chuyển toàn bộ tài sản trong ví',
      'Chỉ là mã định danh để đăng nhập vào mạng xã hội',
      'Không quan trọng vì có thể nhờ đội ngũ hỗ trợ cấp lại nếu bị mất',
    ],
    correctIndex: 1,
    rewardCoins: 80,
    rewardXp: 50,
    explanation:
      'Khóa riêng tư (Private Key) là bằng chứng sở hữu duy nhất đối với tài sản on-chain. Ai có Private Key người đó nắm toàn quyền sở hữu ví. Tuyệt đối KHÔNG BAO GIỜ chia sẻ cho bất kỳ ai!',
  },
  {
    id: 2,
    topic: 'Bảo Mật Ví',
    question: 'Khi tạo ví mới, bạn nhận được 12 hoặc 24 từ khôi phục (Seed Phrase). Cách lưu trữ nào là AN TOÀN NHẤT?',
    options: [
      'Chụp ảnh màn hình lưu trên điện thoại và tải lên Google Drive / iCloud',
      'Nhắn tin gửi qua Zalo, Messenger hoặc email để lưu trữ',
      'Ghi cẩn thận ra giấy và cất giữ ở nơi an toàn, bí mật, không kết nối Internet',
      'Đăng công khai lên mạng xã hội để không bao giờ quên',
    ],
    correctIndex: 2,
    rewardCoins: 80,
    rewardXp: 50,
    explanation:
      'Seed Phrase lưu trên thiết bị điện tử có thể bị hacker đánh cắp nếu máy nhiễm mã độc. Cách an toàn kinh điển nhất là ghi ra giấy hoặc khắc lên kim loại và bảo quản ngoại tuyến (offline).',
  },
  {
    id: 3,
    topic: 'Mạng Ethereum',
    question: 'Phí Gas (Gas Fee) trên mạng lưới Ethereum dùng để chi trả cho ai và nhằm mục đích gì?',
    options: [
      'Nộp thuế cho chính phủ và ngân hàng thế giới',
      'Chi trả cho các thợ đào / người xác thực (Validators) để xử lý và bảo vệ giao dịch',
      'Là tiền hoa hồng trả cho công ty sản xuất máy tính',
      'Phí bản quyền thuê đường truyền cáp quang Internet',
    ],
    correctIndex: 1,
    rewardCoins: 80,
    rewardXp: 50,
    explanation:
      'Phí Gas là chi phí trả cho người xác thực khối để bù đắp năng lượng tính toán thực hiện giao dịch hoặc chạy Smart Contract trên mạng phân tán.',
  },
  {
    id: 4,
    topic: 'Smart Contract',
    question: 'Hợp đồng thông minh (Smart Contract) là gì?',
    options: [
      'Một bản hợp đồng giấy được ký bằng bút mực thông minh',
      'Đoạn mã lập trình tự động thực thi các điều khoản khi đáp ứng đủ điều kiện trên Blockchain mà không cần bên trung gian',
      'Phần mềm chat tự động trả lời người dùng',
      'Chính sách bảo hành điện thoại di động',
    ],
    correctIndex: 1,
    rewardCoins: 100,
    rewardXp: 60,
    explanation:
      'Smart Contract hoạt động như một máy bán hàng tự động kỹ thuật số: Khi bạn đưa đúng tiền và chọn nút, máy sẽ trả hàng chuẩn xác mà không ai có thể can thiệp hay quỵt tiền.',
  },
  {
    id: 5,
    topic: 'Tiêu Chuẩn Token',
    question: 'Tiêu chuẩn ERC-20 trên mạng Ethereum đại diện cho loại tài sản nào?',
    options: [
      'Vật phẩm độc bản không thể thay thế (NFT)',
      'Token có thể hoán đổi tương đương nhau (Fungible Token), như $PIXEL, USDT, DAI',
      'Tập tin hình ảnh âm thanh trong game',
      'Mã nguồn hệ điều hành máy tính',
    ],
    correctIndex: 1,
    rewardCoins: 80,
    rewardXp: 50,
    explanation:
      'ERC-20 là tiêu chuẩn kỹ thuật số phổ biến nhất cho Fungible Token, trong đó mỗi đồng token có giá trị và đặc tính giống hệt nhau (1 $PIXEL của bạn tương đương 1 $PIXEL của người khác).',
  },
  {
    id: 6,
    topic: 'Mạng Thử Nghiệm',
    question: 'Sepolia Testnet là gì và tại sao game Pixel Farm lại sử dụng mạng này?',
    options: [
      'Là mạng chính thức sử dụng tiền thật USD',
      'Là mạng thử nghiệm (Testnet) của Ethereum, cho phép thử nghiệm tính năng Web3 miễn phí mà không rủi ro mất tiền thật',
      'Là một trò chơi điện tử trực tuyến',
      'Là hệ thống ngân hàng nội bộ',
    ],
    correctIndex: 1,
    rewardCoins: 80,
    rewardXp: 50,
    explanation:
      'Sepolia là mạng thử nghiệm mô phỏng chính xác mạng Ethereum chính thức, giúp nhà phát triển và người chơi trải nghiệm chuyển token, gọi contract an toàn 100% bằng SepoliaETH miễn phí.',
  },
  {
    id: 7,
    topic: 'Chữ Ký EIP-712',
    question: 'Chuẩn ký dữ liệu EIP-712 có ưu điểm gì vượt trội so với chữ ký thông thường khi rút thưởng token?',
    options: [
      'Không có ưu điểm gì, chỉ làm chậm giao dịch',
      'Hiển thị rõ ràng cấu trúc dữ liệu người nhận, số lượng, thời hạn (Deadline) trên màn hình ví giúp chống tấn công lừa đảo',
      'Bắt buộc người dùng phải trả gấp đôi phí gas',
      'Cho phép chuyển tiền tự động mà không cần chủ ví đồng ý',
    ],
    correctIndex: 1,
    rewardCoins: 120,
    rewardXp: 70,
    explanation:
      'EIP-712 mã hóa dữ liệu dạng "Typed Structured Data", giúp ví hiển thị tường minh các tham số bạn đang ký xác nhận thay vì một chuỗi hex vô nghĩa bí ẩn, ngăn chặn tấn công Blind Signing.',
  },
  {
    id: 8,
    topic: 'GameFi & On-Chain',
    question: 'Mô hình kết hợp "In-Game Coins" (Off-chain) và "$PIXEL Token" (On-chain) mang lại lợi ích gì lớn nhất cho người chơi?',
    options: [
      'Chơi game mượt mà không tốn phí gas liên tục, đồng thời có thể rút phần thưởng giá trị thực lên Blockchain bất cứ lúc nào',
      'Làm cho game chạy chậm hơn',
      'Xóa toàn bộ dữ liệu nông trại sau mỗi ngày',
      'Bắt buộc phải có mạng Internet tốc độ 10Gbps',
    ],
    correctIndex: 0,
    rewardCoins: 100,
    rewardXp: 60,
    explanation:
      'Mô hình Hybrid GameFi cho phép các thao tác trồng trọt, tưới cây, câu cá diễn ra tức thì với chi phí 0 đồng, và người chơi chỉ đưa tài sản lên On-chain khi muốn giao dịch hoặc nắm giữ thực sự.',
  },
  {
    id: 9,
    topic: 'Cảnh Giác Lừa Đảo',
    question: 'Một trang web hoặc tin nhắn Discord tự xưng Admin game yêu cầu bạn nhập 12 từ Seed Phrase để nhận 10,000 $PIXEL miễn phí. Bạn nên làm gì?',
    options: [
      'Nhập ngay lập tức để kịp nhận quà khuyến mãi',
      'Tuyệt đối KHÔNG nhập và chặn/báo cáo ngay, vì đây là hành vi lừa đảo câu trộm ví (Phishing Scam)',
      'Gửi một nửa cụm từ trước để kiểm tra',
      'Mượn ví của bạn bè để nhập thay',
    ],
    correctIndex: 1,
    rewardCoins: 120,
    rewardXp: 70,
    explanation:
      'Quy tắc vàng trong Web3: Bất kỳ ai yêu cầu Private Key hoặc 12 từ Seed Phrase đều là KẺ LỪA ĐẢO 100%! Không có ngoại lệ. Các dự án chân chính không bao giờ đòi hỏi thông tin này.',
  },
  {
    id: 10,
    topic: 'Đặc Tính Blockchain',
    question: 'Đặc tính cốt lõi nổi bật nhất của công nghệ Blockchain là gì?',
    options: [
      'Dữ liệu có thể tùy ý bị quản trị viên sửa đổi và xóa bỏ bất cứ lúc nào',
      'Phi tập trung, minh bạch, dữ liệu chỉ có thể thêm vào và bất biến không thể làm giả',
      'Tốc độ tải chậm hơn so với viết chữ trên giấy',
      'Chỉ hoạt động được vào ban ngày',
    ],
    correctIndex: 1,
    rewardCoins: 100,
    rewardXp: 60,
    explanation:
      'Nhờ cơ chế đồng thuận phân tán và mật mã học, một khi dữ liệu giao dịch đã được ghi vào chuỗi khối (Block), không một cá nhân hay tổ chức nào có thể đảo ngược hay xóa bỏ nó.',
  },
]

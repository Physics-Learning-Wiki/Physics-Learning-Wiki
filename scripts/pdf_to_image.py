"""
PDF 页面转图片工具
用法:
    python pdf_to_image.py <pdf_path> [options]

示例:
    python pdf_to_image.py document.pdf                          # 全部页面
    python pdf_to_image.py document.pdf -p 1-5                   # 第1~5页
    python pdf_to_image.py document.pdf -p 1-5,8,10-12           # 指定多页
    python pdf_to_image.py document.pdf -p 3- -o output -d 300   # 第3页到末尾，300 DPI
    python pdf_to_image.py document.pdf --merge                  # 全部页面并合并为长图
    python pdf_to_image.py document.pdf -p 1-10 --pdf            # 导出为PDF
"""

import argparse
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("错误: 需要安装 PyMuPDF 库")
    print("请运行: pip install PyMuPDF")
    sys.exit(1)


def parse_page_range(page_str: str, total_pages: int) -> list[int]:
    """
    解析页面范围字符串
    支持格式: "1-5", "1,3,5", "1-5,8,10-12", "3-", "-5"
    返回1-based页码列表
    """
    pages = set()
    parts = page_str.replace(" ", "").split(",")

    for part in parts:
        if "-" in part:
            start_str, end_str = part.split("-", 1)
            start = int(start_str) if start_str else 1
            end = int(end_str) if end_str else total_pages
            if start < 1:
                start = 1
            if end > total_pages:
                end = total_pages
            pages.update(range(start, end + 1))
        else:
            page = int(part)
            if 1 <= page <= total_pages:
                pages.add(page)

    return sorted(pages)


def format_size(size_bytes: int) -> str:
    """格式化文件大小"""
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


def pdf_to_images(
    pdf_path: str,
    pages: str | None = None,
    output_dir: str | None = None,
    dpi: int = 200,
    image_format: str = "png",
    quality: int = 95,
    merge: bool = False,
    output_pdf: bool = False,
    password: str | None = None,
    prefix: str | None = None,
) -> list[Path]:
    """
    将PDF指定页面转换为图片

    Args:
        pdf_path: PDF文件路径
        pages: 页面范围字符串，如 "1-5,8,10-12"，None表示全部页面
        output_dir: 输出目录，默认为PDF同目录下的 images 文件夹
        dpi: 输出图片的DPI，默认200
        image_format: 图片格式，支持 png/jpg/jpeg/webp
        quality: JPG/WEBP 质量 (1-100)，默认95
        merge: 是否合并为单张长图
        output_pdf: 是否输出为PDF
        password: PDF密码（加密PDF时使用）
        prefix: 输出文件名前缀，默认使用PDF文件名

    Returns:
        生成的文件路径列表
    """
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF文件不存在: {pdf_path}")

    # 打开PDF
    doc = fitz.open(str(pdf_path))

    # 处理加密PDF
    if doc.is_encrypted:
        if password is None:
            doc.close()
            raise ValueError("PDF已加密，请使用 --password 参数提供密码")
        if not doc.authenticate(password):
            doc.close()
            raise ValueError("PDF密码错误")

    total_pages = len(doc)

    # 解析页面范围
    if pages is None:
        page_list = list(range(1, total_pages + 1))
    else:
        page_list = parse_page_range(pages, total_pages)

    if not page_list:
        doc.close()
        raise ValueError("未指定有效页面")

    # 设置输出目录
    if output_dir is None:
        output_dir = pdf_path.parent / "images"
    else:
        output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # 文件名前缀
    if prefix is None:
        prefix = pdf_path.stem

    # 图片格式处理
    valid_formats = {"png", "jpg", "jpeg", "webp"}
    image_format = image_format.lower()
    if image_format not in valid_formats:
        print(f"警告: 不支持的格式 '{image_format}'，自动使用 png")
        image_format = "png"
    if image_format == "jpeg":
        image_format = "jpg"

    # 计算缩放矩阵
    zoom = dpi / 72
    matrix = fitz.Matrix(zoom, zoom)

    print(f"PDF: {pdf_path.name} (共 {total_pages} 页)")
    print(f"处理页面: {len(page_list)} 页")
    if len(page_list) <= 20:
        print(f"页码: {', '.join(map(str, page_list))}")
    else:
        print(f"页码: {', '.join(map(str, page_list[:10]))} ... {', '.join(map(str, page_list[-5:]))}")
    print(f"输出目录: {output_dir}")
    print(f"DPI: {dpi}, 格式: {image_format}, 质量: {quality}")
    if merge:
        print("模式: 合并为长图")
    if output_pdf:
        print("模式: 输出为PDF")
    print("-" * 50)

    output_paths: list[Path] = []
    total_size = 0

    # 导出为PDF模式
    if output_pdf:
        output_file = output_dir / f"{prefix}.pdf"
        new_doc = fitz.open()
        for page_num in page_list:
            page = doc[page_num - 1]
            new_doc.insert_pdf(doc, from_page=page_num - 1, to_page=page_num - 1)
        new_doc.save(str(output_file))
        new_doc.close()
        file_size = output_file.stat().st_size
        output_paths.append(output_file)
        print(f"  已保存: {output_file.name} ({format_size(file_size)})")
        doc.close()
        print("-" * 50)
        print(f"完成! 输出文件: {output_file}")
        return output_paths

    # 合并为长图模式
    if merge:
        # 收集所有页面的像素数据
        pixmaps = []
        total_height = 0
        max_width = 0

        for i, page_num in enumerate(page_list):
            page = doc[page_num - 1]
            pix = page.get_pixmap(matrix=matrix)
            pixmaps.append(pix)
            total_height += pix.height
            max_width = max(max_width, pix.width)
            print(f"  正在处理: 第 {page_num} 页 ({i + 1}/{len(page_list)})")

        # 创建合并后的图片
        merged = fitz.Pixmap(pixmaps[0].colorspace, fitz.IRect(0, 0, max_width, total_height), 1)
        merged.clear_with(255)  # 白色背景

        y_offset = 0
        for pix in pixmaps:
            # 每页居中放置
            x_offset = (max_width - pix.width) // 2
            merged.copy(pix, fitz.IRect(x_offset, y_offset, x_offset + pix.width, y_offset + pix.height))
            y_offset += pix.height

        output_file = output_dir / f"{prefix}_merged.{image_format}"
        if image_format == "jpg":
            merged.save(str(output_file), jpg_quality=quality)
        else:
            merged.save(str(output_file))

        file_size = output_file.stat().st_size
        total_size += file_size
        output_paths.append(output_file)
        print(f"  已保存: {output_file.name} ({format_size(file_size)})")

    else:
        # 逐页转换
        for i, page_num in enumerate(page_list):
            page = doc[page_num - 1]
            pix = page.get_pixmap(matrix=matrix)

            output_file = output_dir / f"{prefix}_page_{page_num:03d}.{image_format}"

            if image_format == "jpg":
                pix.save(str(output_file), jpg_quality=quality)
            else:
                pix.save(str(output_file))

            file_size = output_file.stat().st_size
            total_size += file_size
            output_paths.append(output_file)
            print(f"  [{i + 1}/{len(page_list)}] 已保存: {output_file.name} ({format_size(file_size)})")

    doc.close()

    print("-" * 50)
    print(f"完成! 共转换 {len(output_paths)} 个文件，总大小 {format_size(total_size)}")

    return output_paths


def main():
    parser = argparse.ArgumentParser(
        description="将PDF指定页面转换为图片",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
页面范围格式:
    1-5         第1页到第5页
    1,3,5       第1、3、5页
    1-5,8,10-12 混合指定
    3-          第3页到最后
    -5          第1页到第5页
    留空         全部页面

示例:
    %(prog)s document.pdf                          # 全部页面
    %(prog)s document.pdf -p 1-5                   # 第1~5页
    %(prog)s document.pdf -p 1-5,8,10-12           # 指定多页
    %(prog)s document.pdf -p 3- -o output -d 300   # 第3页到末尾，300 DPI
    %(prog)s document.pdf --merge                  # 合并为长图
    %(prog)s document.pdf -p 1-10 --pdf            # 导出为PDF
""",
    )

    parser.add_argument("pdf_path", help="PDF文件路径")
    parser.add_argument("-p", "--pages", help="页面范围，如 '1-5,8,10-12'，留空表示全部页面")
    parser.add_argument("-o", "--output", help="输出目录（默认: PDF同目录/images）")
    parser.add_argument("-d", "--dpi", type=int, default=200, help="输出DPI（默认: 200）")
    parser.add_argument(
        "-f",
        "--format",
        choices=["png", "jpg", "jpeg", "webp"],
        default="png",
        help="图片格式（默认: png）",
    )
    parser.add_argument("-q", "--quality", type=int, default=95, help="JPG/WEBP质量 1-100（默认: 95）")
    parser.add_argument("--merge", action="store_true", help="合并为单张长图")
    parser.add_argument("--pdf", action="store_true", help="输出为PDF（保持矢量）")
    parser.add_argument("--password", help="PDF密码（加密PDF时使用）")
    parser.add_argument("--prefix", help="输出文件名前缀（默认: PDF文件名）")

    args = parser.parse_args()

    try:
        pdf_to_images(
            pdf_path=args.pdf_path,
            pages=args.pages,
            output_dir=args.output,
            dpi=args.dpi,
            image_format=args.format,
            quality=args.quality,
            merge=args.merge,
            output_pdf=args.pdf,
            password=args.password,
            prefix=args.prefix,
        )
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

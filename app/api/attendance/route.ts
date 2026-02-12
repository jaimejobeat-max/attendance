import { NextRequest, NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

// ── 서비스 계정 인증 ──────────────────────────────────────
function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!email || !key || !sheetId) {
    throw new Error(
      "Missing required environment variables: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID"
    );
  }

  const serviceAccountAuth = new JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return { serviceAccountAuth, sheetId };
}

// ── 스프레드시트 & 시트 객체 가져오기 ────────────────────
async function getSheet() {
  const { serviceAccountAuth, sheetId } = getAuth();
  const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
  await doc.loadInfo();

  const sheet = doc.sheetsByTitle["Attendance_Logs"];
  if (!sheet) {
    throw new Error(
      'Sheet tab "Attendance_Logs" not found. Please create it in your spreadsheet.'
    );
  }

  return sheet;
}


// ── Member_Stats 시트 데이터 가져오기 ────────────────────
async function getMemberStats(doc: GoogleSpreadsheet) {
  const sheet = doc.sheetsByTitle["Member_Stats"];
  if (!sheet) return [];

  const rows = await sheet.getRows();
  return rows.map((row) => {
    const obj: Record<string, string> = {};
    for (const header of sheet.headerValues) {
      obj[header] = row.get(header);
    }
    return obj;
  });
}

// ── GET: 전체 데이터 조회 (날짜별 정렬, rowNumber 포함) ───
export async function GET() {
  try {
    const { serviceAccountAuth, sheetId } = getAuth();
    const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle["Attendance_Logs"];
    if (!sheet) {
      throw new Error(
        'Sheet tab "Attendance_Logs" not found. Please create it in your spreadsheet.'
      );
    }

    // 병렬로 데이터 가져오기
    const [rows, stats] = await Promise.all([
      sheet.getRows(),
      getMemberStats(doc),
    ]);

    const data = rows.map((row) => {
      const obj: Record<string, string | number> = {};
      for (const header of sheet.headerValues) {
        obj[header] = row.get(header);
      }
      obj["_rowNumber"] = row.rowNumber;
      return obj;
    });

    // 날짜 내림차순 정렬 (최신순)
    data.sort((a, b) => {
      const dateA = new Date(a["날짜"] as string).getTime();
      const dateB = new Date(b["날짜"] as string).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ success: true, data, stats });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[GET /api/attendance]", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ── POST: 새로운 출석 데이터 추가 (단일 또는 다수) ──────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || (typeof body !== "object")) {
      return NextResponse.json(
        { success: false, error: "Request body must be a JSON object or array" },
        { status: 400 }
      );
    }

    const sheet = await getSheet();

    // 배열이면 일괄 추가 (addRows)
    if (Array.isArray(body)) {
      if (body.length === 0) {
        return NextResponse.json({ success: true, message: "No data to add" }, { status: 200 });
      }
      await sheet.addRows(body);
      return NextResponse.json(
        { success: true, message: `${body.length} rows added` },
        { status: 201 }
      );
    }

    // 객체면 단일 추가 (addRow)
    const newRow = await sheet.addRow(body);
    const addedData: Record<string, string> = {};
    for (const header of sheet.headerValues) {
      addedData[header] = newRow.get(header) ?? "";
    }

    return NextResponse.json(
      { success: true, data: addedData },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[POST /api/attendance]", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ── PUT: 기존 행 수정 ────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const { rowNumber, data } = await request.json();

    if (!rowNumber || !data || typeof data !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Request body must include 'rowNumber' (number) and 'data' (object)",
        },
        { status: 400 }
      );
    }

    const sheet = await getSheet();
    const rows = await sheet.getRows();

    // rowNumber로 해당 행 찾기
    const targetRow = rows.find((r) => r.rowNumber === rowNumber);
    if (!targetRow) {
      return NextResponse.json(
        { success: false, error: `Row number ${rowNumber} not found` },
        { status: 404 }
      );
    }

    // 각 컬럼 값 업데이트
    for (const header of sheet.headerValues) {
      if (header in data) {
        targetRow.set(header, data[header]);
      }
    }

    await targetRow.save();

    const updatedData: Record<string, string> = {};
    for (const header of sheet.headerValues) {
      updatedData[header] = targetRow.get(header) ?? "";
    }

    return NextResponse.json(
      { success: true, data: updatedData },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[PUT /api/attendance]", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ── DELETE: 행 삭제 ──────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { rowNumber } = await request.json();

    if (!rowNumber) {
      return NextResponse.json(
        { success: false, error: "Request body must include 'rowNumber'" },
        { status: 400 }
      );
    }

    const sheet = await getSheet();
    const rows = await sheet.getRows();

    const targetRow = rows.find((r) => r.rowNumber === rowNumber);
    if (!targetRow) {
      return NextResponse.json(
        { success: false, error: `Row number ${rowNumber} not found` },
        { status: 404 }
      );
    }

    await targetRow.delete();

    return NextResponse.json(
      { success: true, message: `Row ${rowNumber} deleted successfully` },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[DELETE /api/attendance]", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

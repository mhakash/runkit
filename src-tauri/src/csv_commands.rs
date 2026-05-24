use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct CsvData {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub row_count: usize,
}

#[derive(Deserialize)]
pub struct WriteCsvPayload {
    pub path: String,
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
}

#[tauri::command]
pub fn read_csv(path: String) -> Result<CsvData, String> {
    let mut rdr = csv::ReaderBuilder::new()
        .flexible(true)
        .from_path(&path)
        .map_err(|e| e.to_string())?;

    let headers: Vec<String> = rdr
        .headers()
        .map_err(|e| e.to_string())?
        .iter()
        .map(|s| s.to_string())
        .collect();

    let col_count = headers.len();

    let mut rows: Vec<Vec<String>> = Vec::new();
    for result in rdr.records() {
        let record = result.map_err(|e| e.to_string())?;
        let mut row: Vec<String> = record.iter().map(|s| s.to_string()).collect();
        // Pad short rows so every row has the same column count
        while row.len() < col_count {
            row.push(String::new());
        }
        rows.push(row);
    }

    let row_count = rows.len();
    Ok(CsvData { headers, rows, row_count })
}

#[tauri::command]
pub fn write_csv(payload: WriteCsvPayload) -> Result<(), String> {
    let mut wtr = csv::WriterBuilder::new()
        .from_path(&payload.path)
        .map_err(|e| e.to_string())?;

    wtr.write_record(&payload.headers).map_err(|e| e.to_string())?;
    for row in &payload.rows {
        wtr.write_record(row).map_err(|e| e.to_string())?;
    }
    wtr.flush().map_err(|e| e.to_string())?;
    Ok(())
}

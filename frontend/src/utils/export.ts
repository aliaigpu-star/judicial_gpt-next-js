/**
 * Export Utilities
 * Simple functions to export data as CSV or JSON
 */

/**
 * Export data as CSV file
 */
export function exportToCSV<T extends Record<string, any>>(
    data: T[],
    filename: string,
    headers?: string[]
): void {
    if (data.length === 0) {
        alert('No data to export');
        return;
    }

    // Get headers from first object if not provided
    const csvHeaders = headers || Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = [
        // Header row
        csvHeaders.join(','),
        // Data rows
        ...data.map(row => 
            csvHeaders.map(header => {
                const value = row[header];
                // Handle values with commas, quotes, or newlines
                if (value === null || value === undefined) return '';
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            }).join(',')
        )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Export data as JSON file
 */
export function exportToJSON<T>(data: T, filename: string): void {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

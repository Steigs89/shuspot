import React, { useState, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Edit2, Trash2, Save, X, Play } from 'lucide-react';

const BookGrid = ({ books, onUpdateBook, onDeleteBook, onBulkUpdate, selectedBooks, setSelectedBooks, onLaunchBook }) => {
  const [gridApi, setGridApi] = useState(null);

  // Custom cell renderer for editable cells
  const EditableCellRenderer = ({ value, data, colDef, api, node }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value || '');

    const startEdit = () => {
      setIsEditing(true);
      setEditingRows(prev => new Set([...prev, data.id]));
    };

    const saveEdit = async () => {
      try {
        const updatedData = { ...data, [colDef.field]: editValue };
        await onUpdateBook(data.id, updatedData);
        setIsEditing(false);
        setEditingRows(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.id);
          return newSet;
        });
        // Refresh the grid
        api.refreshCells({ rowNodes: [node] });
      } catch (error) {
        console.error('Error updating book:', error);
        alert('Error updating book');
      }
    };

    const cancelEdit = () => {
      setEditValue(value || '');
      setIsEditing(false);
      setEditingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.id);
        return newSet;
      });
    };

    if (isEditing) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
          <input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            style={{
              flex: 1,
              padding: '2px 4px',
              border: '1px solid #007bff',
              borderRadius: '2px',
              fontSize: '12px'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            autoFocus
          />
          <button onClick={saveEdit} style={{ padding: '2px', border: 'none', background: 'none', cursor: 'pointer', color: '#28a745' }}>
            <Save size={12} />
          </button>
          <button onClick={cancelEdit} style={{ padding: '2px', border: 'none', background: 'none', cursor: 'pointer', color: '#dc3545' }}>
            <X size={12} />
          </button>
        </div>
      );
    }

    return (
      <div
        onClick={startEdit}
        style={{
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '2px',
          minHeight: '20px',
          display: 'flex',
          alignItems: 'center'
        }}
        title="Click to edit"
      >
        {value || ''}
        <Edit2 size={10} style={{ marginLeft: '4px', opacity: 0.5 }} />
      </div>
    );
  };

  // Action cell renderer
  const ActionCellRenderer = ({ data }) => {
    const handleDelete = async () => {
      if (window.confirm(`Are you sure you want to delete "${data.title}"?`)) {
        try {
          await onDeleteBook(data.id);
        } catch (error) {
          console.error('Error deleting book:', error);
          alert('Error deleting book');
        }
      }
    };

    const handleLaunch = () => {
      if (onLaunchBook) {
        onLaunchBook(data);
      }
    };

    return (
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {onLaunchBook && (
          <button
            onClick={handleLaunch}
            style={{
              padding: '4px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#007bff',
              opacity: 1
            }}
            title="Launch book in reader"
            disabled={false}
          >
            <Play size={14} />
          </button>
        )}
        <button
          onClick={handleDelete}
          style={{
            padding: '4px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: '#dc3545'
          }}
          title="Delete book"
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  };

  const columnDefs = [
    {
      headerName: '',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      pinned: 'left'
    },
    {
      headerName: 'ID',
      field: 'id',
      width: 70,
      pinned: 'left'
    },
    {
      headerName: 'Title',
      field: 'title',
      width: 300,
      cellRenderer: EditableCellRenderer,
      tooltipField: 'title'
    },
    {
      headerName: 'Author',
      field: 'author',
      width: 200,
      cellRenderer: EditableCellRenderer,
      tooltipField: 'author'
    },
    {
      headerName: 'Genre',
      field: 'genre',
      width: 150,
      cellRenderer: EditableCellRenderer
    },
    {
      headerName: 'Book Type',
      field: 'book_type',
      width: 150,
      cellRenderer: EditableCellRenderer
    },
    {
      headerName: 'Fiction Type',
      field: 'fiction_type',
      width: 130,
      cellRenderer: EditableCellRenderer
    },
    {
      headerName: 'Reading Level',
      field: 'reading_level',
      width: 130,
      cellRenderer: EditableCellRenderer
    },
    {
      headerName: 'Cover Image',
      field: 'cover_image_url',
      width: 200,
      cellRenderer: EditableCellRenderer,
      tooltipField: 'cover_image_url'
    },
    {
      headerName: 'File Name',
      field: 'file_name',
      width: 250,
      tooltipField: 'file_name'
    },
    {
      headerName: 'File Type',
      field: 'file_type',
      width: 150
    },
    {
      headerName: 'File Size',
      field: 'file_size',
      width: 120,
      valueFormatter: (params) => {
        if (!params.value) return '';
        const bytes = params.value;
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      }
    },
    {
      headerName: 'Uploaded',
      field: 'uploaded_at',
      width: 180,
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleString();
      }
    },
    {
      headerName: 'Notes',
      field: 'notes',
      width: 200,
      cellRenderer: EditableCellRenderer,
      tooltipField: 'notes'
    },
    {
      headerName: 'Actions',
      width: 100,
      cellRenderer: ActionCellRenderer,
      pinned: 'right'
    }
  ];

  const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    tooltipShowDelay: 500
  };

  const onGridReady = (params) => {
    setGridApi(params.api);
  };

  const onSelectionChanged = useCallback(() => {
    if (gridApi) {
      const selectedRows = gridApi.getSelectedRows();
      setSelectedBooks(selectedRows);
    }
  }, [gridApi, setSelectedBooks]);

  return (
    <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
      <AgGridReact
        rowData={books}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        onGridReady={onGridReady}
        onSelectionChanged={onSelectionChanged}
        rowSelection="multiple"
        suppressRowClickSelection={true}
        animateRows={true}
        pagination={true}
        paginationPageSize={50}
        enableCellTextSelection={true}
        getRowId={(params) => params.data.id}
      />
    </div>
  );
};

export default BookGrid;
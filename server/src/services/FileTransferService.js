const zlib = require('zlib');
const { v4: uuidv4 } = require('uuid');

class FileTransferService {
  constructor(supabaseClient, storageClient) {
    this.supabase = supabaseClient;
    this.storage = storageClient;
    this.maxFileSize = 10 * 1024 * 1024 * 1024;
    this.chunkSize = 1024 * 1024;
    this.compressibleTypes = [
      'text',
      'application/json',
      'application/xml',
      'image/svg+xml',
      'application/pdf'
    ];
  }

  async createTransfer(sessionId, fileName, fileSize, fileType, senderId) {
    if (fileSize > this.maxFileSize) {
      throw new Error('File size exceeds maximum allowed');
    }

    const transferId = uuidv4();
    const isCompressible = this._isCompressible(fileType);

    const { data, error } = await this.supabase
      .from('file_transfers')
      .insert([
        {
          id: transferId,
          session_id: sessionId,
          sender_id: senderId,
          file_name: fileName,
          file_size: fileSize,
          file_type: fileType,
          is_compressed: isCompressible,
          status: 'pending',
          bytes_transferred: 0
        }
      ])
      .select();

    if (error) {
      throw new Error(`Failed to create transfer: ${error.message}`);
    }

    return {
      transferId,
      chunkSize: this.chunkSize,
      shouldCompress: isCompressible
    };
  }

  async updateTransferProgress(transferId, bytesTransferred) {
    const { error } = await this.supabase
      .from('file_transfers')
      .update({
        bytes_transferred: bytesTransferred,
        updated_at: new Date().toISOString()
      })
      .eq('id', transferId);

    if (error) {
      console.error(`Failed to update transfer progress: ${error.message}`);
    }

    return !error;
  }

  async completeTransfer(transferId, receiverId, compressionRatio = 1.0) {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('file_transfers')
      .update({
        status: 'completed',
        is_completed: true,
        completed_at: now,
        compression_ratio: compressionRatio,
        receiver_id: receiverId,
        updated_at: now
      })
      .eq('id', transferId)
      .select();

    if (error) {
      throw new Error(`Failed to complete transfer: ${error.message}`);
    }

    return data[0];
  }

  async getTransferHistory(sessionId) {
    const { data, error } = await this.supabase
      .from('file_transfers')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch transfer history: ${error.message}`);
    }

    return data || [];
  }

  compressData(data) {
    return new Promise((resolve, reject) => {
      zlib.gzip(data, (err, compressed) => {
        if (err) reject(err);
        else resolve(compressed);
      });
    });
  }

  decompressData(data) {
    return new Promise((resolve, reject) => {
      zlib.gunzip(data, (err, decompressed) => {
        if (err) reject(err);
        else resolve(decompressed);
      });
    });
  }

  _isCompressible(fileType) {
    if (!fileType) return false;
    return this.compressibleTypes.some(type => fileType.startsWith(type));
  }

  calculateCompressionRatio(originalSize, compressedSize) {
    if (originalSize === 0) return 1.0;
    return (1 - compressedSize / originalSize) * 100;
  }
}

module.exports = FileTransferService;

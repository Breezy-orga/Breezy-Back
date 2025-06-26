import Media, { IMedia } from "../models/Media";
export const mediaRepository = {
  async findById(mediaId: string) {
    if (!mediaId) {
      throw new Error('Media ID is required');
    }
    const media = await Media.findById(mediaId);
    if (!media) {
      throw new Error('Media not found');
    }
    return media;
  },
  async create(mediaData: any) {
    const media = new Media(mediaData);
    await media.save();
    return media;
  },
  async update(mediaId: string, mediaData: any) {
    if (!mediaId) {
      throw new Error('Media ID is required');
    }
    const media = await Media.findByIdAndUpdate(mediaId, mediaData, { new: true });
    if (!media) {
      throw new Error('Media not found');
    }
    return media;
  },
  async delete(mediaId: string) {
    if (!mediaId) {
      throw new Error('Media ID is required');
    }
    const media = await Media.findByIdAndDelete(mediaId);
    if (!media) {
      throw new Error('Media not found');
    }
    return media;
  }
};

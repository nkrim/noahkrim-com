#!/usr/bin/python3

import boto3
import os
import re
import time
from pathlib import Path
from typing import List, Optional

profile_name = 'noahkrim.com-boto3'
metadata = {'uploaded-via': 'boto3'}
cachecontrol = 'max-age=60,s-maxage=31536000'
cachecontrol_img = 'max-age=315360000,s-maxage=31536000'

def upload_directory_to_s3(
    directory_path: str,
    bucket_name: str,
    s3_prefix: str = "",
    exclude_patterns: Optional[List[str]] = None
) -> List[str]:
    """
    Uploads all contents of a directory to an S3 bucket.

    Args:
        directory_path (str): Local directory path to upload
        bucket_name (str): Name of the S3 bucket
        s3_prefix (str): Optional prefix for S3 keys (like a folder path)
        exclude_patterns (List[str]): Optional list of patterns to exclude (e.g., ["*.tmp", ".DS_Store"])

    Returns:
        List[str]: List of uploaded S3 keys
    """
    if exclude_patterns is None:
        exclude_patterns = []

    session = boto3.Session(profile_name=profile_name)
    s3_client = session.client('s3')
    uploaded_files = []

    # Convert directory path to Path object for easier handling
    base_path = Path(directory_path)

    if not base_path.exists():
        raise ValueError(f"Directory {directory_path} does not exist")

    # Walk through all files in the directory
    for local_path in base_path.rglob('*'):
        # Skip if it's a directory
        if local_path.is_dir():
            continue

        # Skip if file matches any exclude pattern
        if any(local_path.match(pattern) for pattern in exclude_patterns):
            continue

        # Calculate relative path for S3 key
        relative_path = local_path.relative_to(base_path)
        s3_key = f"{s3_prefix.rstrip('/')}/{relative_path}" if s3_prefix else str(relative_path)

        # Cache Control
        cc = cachecontrol
        if re.search('static/img', str(relative_path)):
            print(f'Image detected: {s3_key}')
            cc = cachecontrol_img

        try:
            # Upload file
            s3_client.upload_file(
                str(local_path),
                bucket_name,
                s3_key,
                ExtraArgs={
                    'ContentType': _guess_content_type(local_path),
                    'Metadata': metadata,
                    'CacheControl': cc
                }
            )
            uploaded_files.append(s3_key)
            print(f"Uploaded: {s3_key}")
        except Exception as e:
            print(f"Error uploading {s3_key}: {str(e)}")

    return uploaded_files

def create_cloudfront_invalidation(
    distribution_id: str,
    paths: List[str],
    caller_reference: Optional[str] = None
) -> str:
    """
    Creates a CloudFront invalidation for specified paths.

    Args:
        distribution_id (str): CloudFront distribution ID
        paths (List[str]): List of paths to invalidate (e.g., ['/images/*', '/index.html'])
        caller_reference (str): Optional unique identifier for the invalidation

    Returns:
        str: Invalidation ID
    """
    session = boto3.Session(profile_name=profile_name)
    cloudfront_client = session.client('cloudfront')

    if not caller_reference:
        caller_reference = f"inv-{int(time.time())}"

    try:
        response = cloudfront_client.create_invalidation(
            DistributionId=distribution_id,
            InvalidationBatch={
                'Paths': {
                    'Quantity': len(paths),
                    'Items': paths
                },
                'CallerReference': caller_reference
            }
        )

        invalidation_id = response['Invalidation']['Id']
        print(f"Created invalidation: {invalidation_id}")
        return invalidation_id

    except Exception as e:
        print(f"Error creating invalidation: {str(e)}")
        raise

def _guess_content_type(file_path: Path) -> str:
    """Helper function to guess the content type based on file extension"""
    import mimetypes
    
    content_type, _ = mimetypes.guess_type(str(file_path))
    return content_type or 'application/octet-stream'

if __name__ == '__main__':
    upload_directory_to_s3('build', 'noahkrim.com', exclude_patterns=[
        '.DS_Store'
    ])
    create_cloudfront_invalidation('E272WVRDL39R5C', ['/*'])

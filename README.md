# node-red-contrib-http-request-multipart-formdata
This is a node-red node for posting http(s) requests containing files as multipart formData.

## Installation
```sh
$ npm install @superbexperience/node-red-contrib-http-request-multipart-formdata
```

## Usage
url (this is specified on the node)

The `msg.payload` content will converted to Form Data via `object-to-formdata`.
To upload file, just append the files to `msg.files` using following data structure:

```
msg.files = IFile[];

### IFile
{
    fieldname: string,
    filepath:  string (ex: "/full/path/of/filename.ext"),
    filename: filename.ext
}
```
